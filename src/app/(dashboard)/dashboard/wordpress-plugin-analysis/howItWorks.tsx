import { Info, Shield } from "lucide-react";

export const HowItWorks = () => {
  return (
    <div className="space-y-6">
      <h4 className="font-bold uppercase text-xs mb-4 flex items-center gap-2">
        <Info size={14} /> How it works
      </h4>

      <div className="grid grid-cols-1 gap-4">
        <div className="flex gap-4 p-4 border border-[#141414]/10 ">
          <div className="w-8 h-8 bg-[#141414] text-primary-foreground dark:text-primary flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <p className="font-bold text-[14px] text-primary/90 dark:text-black uppercase mb-1">
              Download & Install
            </p>
            <p className="text-[12px] text-primary/80 dark:text-black leading-relaxed">
              Download the .zip file and upload it to your WordPress site via{" "}
              <strong>Plugins &gt; Add New &gt; Upload</strong>.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-4 border border-[#141414]/10 ">
          <div className="w-8 h-8 bg-[#141414] text-primary-foreground dark:text-primary flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <p className="font-bold text-[14px] text-primary/90 dark:text-black uppercase mb-1">
              Connect & Audit
            </p>
            <p className="text-[12px] text-primary/80 dark:text-black leading-relaxed">
              Return here, verify you are conncted and you can run your plugin
              analysis.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-blue-600" />
          <p className="text-[10px] font-bold uppercase text-blue-900">
            Security Note
          </p>
        </div>
        <p className="text-[12px] text-blue-800 leading-relaxed">
          This plugin only exposes your active plugin list and is protected by a
          secret key. It does not allow any modifications to your site.
        </p>
      </div>
    </div>
  );
};
