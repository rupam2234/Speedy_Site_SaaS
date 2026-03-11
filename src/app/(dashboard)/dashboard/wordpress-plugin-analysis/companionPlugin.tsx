"use client";

import JSZip from "jszip";
import { FileArchive } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { HowItWorks } from ".";
import { useSiteContext } from "../siteContext";
import { cachedData, cleanExpiredCache } from "@/components/utils";

export default function ConnectionPlugin({ onClose }: { onClose: () => void }) {
  const { selectedSite } = useSiteContext();
  const [secretKey, setSecretKey] = useState<string>("");

  useEffect(() => {
    if (!selectedSite) return;

    cleanExpiredCache({
      prefix: "plugin_analysis_secret",
      session_Storage: false,
    }); // cleanup expired keys

    const fetchSecret = async () => {
      const key = `plugin_analysis_secret:${selectedSite}`;

      const { response } = await cachedData({
        fn: wpSecret,
        key: key,
        session_Storage: false,
        ttl: 1440 * 60 * 1000, // 1 day
      });

      if (!response) {
        const newKey =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);

        await saveWpSecret(newKey); // save into database
        setSecretKey(newKey);
      } else {
        setSecretKey(response);
      }
    };

    fetchSecret();
  }, [selectedSite]);

  const phpCode = `<?php
  /**
   * Plugin Name: Speedy Site Plugin Auditor
   * Description: Connects your site to the Speedy Site plugin performance auditor.
   * Version: 1.2
   * Author: Speedy Site
   */

  // Pre-authenticated key for this specific installation
  define('SPEEDY_SITE_AUTH_KEY', '${secretKey}');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/80 backdrop-blur-sm">
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
              <div className=" flex gap-2">
                <button
                  onClick={handleDownload}
                  className="border border-[#141414] p-2 hover:bg-[#141414] hover:text-[#E4E3E0] dark:hover:text-[#E4E3E0] dark:text-black text-primary transition-all flex items-center gap-2 text-[10px] font-mono uppercase"
                  title="Download as .zip file"
                >
                  <FileArchive size={14} />
                  Download Plugin (.zip)
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
    </div>
  );

  async function handleDownload() {
    const zip = new JSZip();
    const folder = zip.folder("speedy-site-plugin-auditor");
    folder?.file("speedy-site-plugin-auditor.php", phpCode);
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

  async function wpSecret() {
    if (!selectedSite) return;

    const res = await fetch("/api/wordpress/wp-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: selectedSite }),
    });

    const body: any = await res.json();

    if (!res.ok) {
      console.error(body.message ?? "failed to fetch secret");
    }

    return body.data;
  }

  async function saveWpSecret(secret: string) {
    if (!selectedSite) return;

    const res = await fetch("/api/wordpress/wp-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: selectedSite, secret: secret }),
    });

    const body: any = await res.json();

    if (!res.ok) {
      console.error(body.message ?? "failed to save secret");
    }

    return;
  }
}
