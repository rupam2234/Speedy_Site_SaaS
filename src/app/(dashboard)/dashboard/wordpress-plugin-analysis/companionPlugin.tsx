"use client";

import JSZip from "jszip";
import { FileArchive } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { HowItWorks } from ".";
import { useSiteContext } from "../siteContext";

import { createPortal } from "react-dom";


/**
 * Builds the plugin PHP with this domain's access key baked in, so the
 * downloaded zip is pre-authenticated on activation day.
 */
function buildPluginPhp(secretKey: string) {
  const apiOrigin = (
    process.env.NEXT_PUBLIC_PROD_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/+$/, "");

  return `<?php
  /**
   * Plugin Name: Speedy Site Plugin Auditor
   * Description: Connects your site to the Speedy Site plugin performance auditor and auto-injects RUM collector for paid plans.
   * Version: 1.7
   * Author: Speedy Site
   */

  // Pre-authenticated key for this specific installation
  define('SPEEDY_SITE_AUTH_KEY', '${secretKey}');

  // Production API origin; the WordPress server cannot reach the dashboard's localhost
  define('SPEEDY_SITE_API_ORIGIN', '${apiOrigin}');

  // Add settings page (Optional, for manual overrides)
  add_action('admin_menu', function() {
      add_menu_page(
          'Speedy Auditor Settings',
          'Speedy Auditor',
          'manage_options',
          'speedy-site-auditor-settings',
          'speedy_site_perf_auditor_settings_page',
          'dashicons-performance'
      );
  });

  // Register settings
  add_action('admin_init', function() {
      register_setting('speedy_site_auditor_settings_group', 'speedy_site_secret_key');
  });

  function speedy_site_perf_auditor_settings_page() {
      $stored_key = get_option('speedy_site_secret_key');
      ?>
      <div class="wrap">
          <h1>Speedy Site Performance Auditor Settings</h1>
          <div class="notice notice-info">
              <p><strong>Status:</strong> This plugin is pre-authenticated with your Speedy Site Auditor utility. No manual configuration is required.</p>
          </div>
          <form method="post" action="options.php">
              <?php settings_fields('speedy_site_auditor_settings_group'); ?>
              <table class="form-table">
                  <tr valign="top">
                  <th scope="row">Override Secret Key</th>
                  <td>
                      <input type="text" name="speedy_site_secret_key" value="<?php echo esc_attr($stored_key); ?>" class="regular-text" placeholder="Optional override..." />
                      <p class="description">Only use this if you want to change the key from the default one comes with this plugin.</p>
                  </td>
                  </tr>
              </table>
              <?php submit_button(); ?>
          </form>
      </div>
      <?php
  }

  add_action('rest_api_init', function () {
      register_rest_route('speedy-site/v1', '/plugins', array(
          'methods' => 'GET',
          'callback' => 'speedy_site_perf_auditor_get_plugins',
          'permission_callback' => 'speedy_site_perf_auditor_check_key'
      ));

      register_rest_route('speedy-site/v1', '/status', array(
          'methods' => 'GET',
          'callback' => 'speedy_site_perf_auditor_get_status',
          'permission_callback' => '__return_true'
      ));
  });

  // RUM Injector module -- auto-injects collector for paid managed_wp sites
  function speedy_site_get_rum_injection() {
      $host = wp_parse_url(home_url(), PHP_URL_HOST);
      if (!$host) return array('inject' => false, 'reason' => 'missing_domain');

      $domain = strtolower(trim($host));
      $domain = preg_replace('/^www\\./', '', $domain);
      $key = defined('SPEEDY_SITE_AUTH_KEY') ? SPEEDY_SITE_AUTH_KEY : '';
      $apiOrigin = defined('SPEEDY_SITE_API_ORIGIN') ? rtrim(SPEEDY_SITE_API_ORIGIN, '/') : '';
      if (!$key || !$apiOrigin) return array('inject' => false, 'reason' => 'missing_config');

      // Version the cache so an upgraded plugin never inherits an old decision.
      $transientKey = 'speedy_site_rum_injection_v1_7_' . md5($domain);
      $cached = get_transient($transientKey);
      if ($cached !== false) return $cached;

      $response = wp_remote_post($apiOrigin . '/api/wordpress/injection', array(
          'timeout' => 3,
          'blocking' => true,
          'headers' => array('Content-Type' => 'application/json'),
          'body' => wp_json_encode(array('domain' => $domain, 'key' => $key)),
      ));

      if (is_wp_error($response)) {
          return array('inject' => false, 'reason' => 'request_failed');
      }
      $statusCode = wp_remote_retrieve_response_code($response);
      if ($statusCode !== 200) {
          return array('inject' => false, 'reason' => 'http_' . $statusCode);
      }

      $data = json_decode(wp_remote_retrieve_body($response), true);
      if (!is_array($data)) return array('inject' => false, 'reason' => 'invalid_response');

      // A successful decision is safe to cache for five minutes. A negative
      // decision can precede payment (or a missed webhook), so keep it only
      // briefly to avoid leaving RUM inactive after the site becomes entitled.
      $cacheTtl = !empty($data['inject']) ? 5 * MINUTE_IN_SECONDS : 30;
      set_transient($transientKey, $data, $cacheTtl);
      return $data;
  }

  add_action('wp_enqueue_scripts', function () {
      if (is_admin()) return;

      $data = speedy_site_get_rum_injection();
      if (!empty($data['inject']) && !empty($data['scriptUrl'])) {
          wp_enqueue_script('speedy-site-rum', $data['scriptUrl'], array(), null, false);
      }
  });

  function speedy_site_perf_auditor_check_key(WP_REST_Request $request) {
      $provided_key = $request->get_param('key');
      $stored_key = get_option('speedy_site_secret_key');
      
      // 1. If no key is provided at all, return 401 for discovery
      if (empty($provided_key)) {
          return new WP_Error('rest_forbidden', 'Secret key required for access.', array('status' => 401));
      }
      
      // 2. Check against hardcoded key OR stored override key
      if ($provided_key === SPEEDY_SITE_AUTH_KEY || (!empty($stored_key) && $provided_key === $stored_key)) {
          return true;
      }
      
      return new WP_Error('rest_forbidden', 'Invalid secret key.', array('status' => 401));
  }

  function speedy_site_perf_auditor_get_status() {
      $rum = speedy_site_get_rum_injection();
      return array(
          'pluginActive' => true,
          'rumActive' => !empty($rum['inject']) && !empty($rum['scriptUrl']),
          'rumScriptUrl' => !empty($rum['scriptUrl']) ? $rum['scriptUrl'] : null,
          'rumReason' => !empty($rum['inject']) ? 'entitled' : (isset($rum['reason']) ? $rum['reason'] : 'not_entitled'),
          'checkedAt' => gmdate('c')
      );
  }

  function speedy_site_perf_auditor_get_plugins() {
      if (!function_exists('get_plugin_data')) {
          require_once ABSPATH . 'wp-admin/includes/plugin.php';
      }
      
      global $wpdb;
      $start_time = microtime(true);
      
      $plugins = get_option('active_plugins');
      $plugin_data = array();
      foreach ($plugins as $plugin_path) {
          $data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin_path);
          $plugin_data[] = array(
              'name' => $data['Name'],
              'description' => strip_tags($data['Description']),
              'version' => $data['Version']
          );
      }
      
      return array(
          'plugins' => $plugin_data,
          'environment' => array(
              'total_queries' => get_num_queries(),
              'php_version' => phpversion(),
              'memory_usage' => size_format(memory_get_usage(), 2),
              'load_time_ms' => round((microtime(true) - $start_time) * 1000, 2)
          )
      );
  }
  `;
}

/**
 * Resolves the stable per-site plugin key. The server owns key creation and
 * always returns the existing key for a site, so every download is reusable.
 */
export async function resolvePluginSecret(domain: string): Promise<string> {
  if (!domain) throw new Error("Domain is required");

  const res = await fetch("/api/wordpress/plugin-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ domain }),
  });

  const body: any = await readJson(res);
  if (!res.ok || !body?.key) {
    throw new Error(
      body?.error || body?.message || "Failed to prepare plugin key",
    );
  }
  return body.key;
}

/**
 * Zips the plugin with this domain access key baked in and downloads it.
 * Shared by the connection modal and the setup tour, so a site connects on
 * activation without the user copying any key.
 */
export async function downloadPluginZip(
  domain: string,
  resolvedSecretKey?: string,
): Promise<void> {
  if (!domain) throw new Error("Domain is required");

  // Both onboarding and Settings use this function. The key is resolved by
  // the same server endpoint, so their downloads always contain the same
  // site-bound credential and the same plugin configuration.
  const secretKey = resolvedSecretKey ?? (await resolvePluginSecret(domain));

  const zip = new JSZip();
  const folder = zip.folder("speedy-site-plugin-auditor");
  folder?.file("speedy-site-plugin-auditor.php", buildPluginPhp(secretKey));
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = "speedy-site-plugin-auditor.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download plugin with a pre-resolved secret key (for ConnectionPlugin component).
 */
export async function downloadPluginZipWithKey(domain: string, secretKey: string): Promise<void> {
  await downloadPluginZip(domain, secretKey);
}

export function ConnectionPlugin({ onClose }: { onClose: () => void }) {
  const { selectedSite } = useSiteContext();
  const [secretKey, setSecretKey] = useState<string>("");

  useEffect(() => {
    if (!selectedSite) return;
    let alive = true;

    async function fetchSecretAndStatus() {
      try {
        const secret = await resolvePluginSecret(selectedSite);
        if (alive) setSecretKey(secret);

        // Fetch connection status
        await checkConnection();
      } catch (error) {
        console.error("Failed to fetch secret or status:", error);
        if (alive) setSecretKey("");
      }
    }

    fetchSecretAndStatus();

    return () => {
      alive = false;
    };
  }, [selectedSite]);

  async function checkConnection() {
    if (!selectedSite) return;
    try {
      const res = await fetch("/api/wordpress/connection-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedSite }),
      });
      const data = await readJson(res);
      // Connection status is fetched but not stored in state (UI not fully updated yet)
      console.log("Connection status:", data);
    } catch (error) {
      console.error("Failed to check connection:", error);
    }
  }

  async function handlePluginDownload() {
    if (!selectedSite || !secretKey) return;
    try {
      await downloadPluginZipWithKey(selectedSite, secretKey);
    } catch (error) {
      console.error("Failed to download plugin:", error);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#141414] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-[16px_16px_0px_0px_rgba(20,20,20,1)]"
      >
        <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
          <h3 className="font-bold uppercase tracking-widest text-sm">
            Speedy Companion Plugin
          </h3>
          <button
            onClick={onClose}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <HowItWorks />
            <div className="relative mt-8 group">
              <div className="flex gap-2">
                <button
                  onClick={handlePluginDownload}
                  disabled={!secretKey}
                  className="border border-[#141414] p-2 hover:bg-[#141414] hover:text-[#E4E3E0]
                            disabled:opacity-50 disabled:cursor-not-allowed
                            dark:hover:text-[#E4E3E0] dark:text-black text-primary
                            transition-all flex items-center gap-2 text-[10px] font-mono uppercase"
                  title={
                    !secretKey
                      ? "Preparing plugin..."
                      : "Download WordPress plugin"
                  }
                >
                  <FileArchive size={14} />
                  {secretKey ? "Download Plugin" : "Preparing Plugin..."}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-[#141414] uppercase font-bold text-xs tracking-widest dark:hover:text-[#E4E3E0] dark:text-black text-primary hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

/**
 *
 * @param domain domain to get WP secret for
 * @returns WP plugin secret of a domain
 */
export async function getWpSecret(domain: string) {
  return resolvePluginSecret(domain);
}
/**
 * Reads a fetch response as JSON without throwing when the body is not JSON.
 * A crashed handler answers with plain text ("Internal Server Error"), which
 * otherwise surfaces as a raw "Unexpected token" error.
 */
async function readJson(res: Response): Promise<any> {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
