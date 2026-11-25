import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getSetupProgress,
  isSetupComplete,
} from "../src/lib/setupProgress.ts";

describe("site setup progress", () => {
  it("reports an incomplete setup", () => {
    const order = {
      order_status: false,
      tour: { site_selected: true },
    };

    assert.deepEqual(getSetupProgress(order), {
      siteConnected: true,
      pluginVerified: false,
      serviceActive: false,
    });
    assert.equal(isSetupComplete(order), false);
  });

  it("reports a setup with a verified plugin but no active service as incomplete", () => {
    const order = {
      order_status: false,
      tour: {
        site_selected: true,
        plugin_verified: true,
      },
    };

    assert.equal(isSetupComplete(order), false);
  });

  it("reports a completed setup", () => {
    const order = {
      order_status: true,
      tour: {
        site_selected: true,
        plugin_verified: true,
        service_active: true,
      },
    };

    assert.deepEqual(getSetupProgress(order), {
      siteConnected: true,
      pluginVerified: true,
      serviceActive: true,
    });
    assert.equal(isSetupComplete(order), true);
  });

  it("treats the recorded service step as active even without the payment flag", () => {
    const order = {
      order_status: false,
      tour: {
        site_selected: true,
        plugin_verified: true,
        service_active: true,
      },
    };

    assert.equal(isSetupComplete(order), true);
  });
});
