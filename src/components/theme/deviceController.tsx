import { useSiteContext } from "@/app/(dashboard)/dashboard/siteContext";
import { MonitorSmartphone } from "lucide-react";

interface Props {
  /**
   * disables "all" device option
   */
  disableAllDevices: boolean;

  /**
   *  disable "tablet"
   */
  disableTablet: boolean;
}

/**
 * device controller component
 * @param disableAllDevices disables "all" device type from the component
 * @param disableTablet disable "tablets" from the component
 * @returns device buttons with global context control
 */
export function DeviceController({ disableAllDevices, disableTablet }: Props) {
  const devices = ["Desktop", "Mobile", "Tablet", "All"] as const;

  const { selectedDevice, setSelectedDevice } = useSiteContext();

  return (
    <div className="p-1.5 dark:bg-secondary-background bg-gray-500/10 border-gray-500/20 border rounded-sm">
      <div className="flex gap-2 w-full items-center px-2">
        <MonitorSmartphone size={18} className="mr-2" />
        {disableAllDevices ? (
          <>
            {devices
              .filter((x) => x !== "All")
              .map((device) => (
                <button
                  key={device}
                  className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                    selectedDevice === device
                      ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                      : ``
                  }`}
                  onClick={() => setSelectedDevice(device)}
                >
                  {device}
                </button>
              ))}
          </>
        ) : disableAllDevices === false && disableTablet ? (
          <>
            {devices
              .filter((x) => x !== "Tablet" && x !== "All")
              .map((device) => (
                <button
                  key={device}
                  className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                    selectedDevice === device
                      ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                      : ``
                  }`}
                  onClick={() => setSelectedDevice(device)}
                >
                  {device}
                </button>
              ))}
          </>
        ) : (
          <>
            {devices.map((device) => (
              <button
                key={device}
                className={`cursor-pointer font-medium px-4 py-1 rounded-sm text-sm ${
                  selectedDevice === device
                    ? `text-accent bg-accent-foreground dark:bg-secondary dark:text-primary hover:text-accent`
                    : ``
                }`}
                onClick={() => setSelectedDevice(device)}
              >
                {device}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
