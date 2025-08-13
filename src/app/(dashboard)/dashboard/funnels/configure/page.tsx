"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useSiteContext } from "../../siteContext";
import TooltipIcon from "@/components/utils/customTooltip";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = {
  step_order: number;
  trigger: string;
  value: string;
  selector?: string;
  event?: string;
  match_type?: string;
  page_path?: string;
};

export default function JourneyBuilder() {
  const { selectedSite } = useSiteContext();
  const [journeyName, setJourneyName] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addStep = () => {
    const lastStep = steps[steps.length - 1];

    if (!lastStep || (lastStep.trigger.trim() && lastStep.value.trim())) {
      setStepError(null);
      const newStep = {
        step_order: steps.length,
        trigger: "text",
        value: "",
        selector: "",
        event: "click",
        match_type: "",
        page_path: "",
      };
      setSteps([...steps, newStep]);
      setSelectedStepIndex(steps.length); // select the new step
    } else {
      setStepError("Please complete the last step before adding a new one.");
    }
  };

  const updateStep = (index: number, updated: Partial<Step>) => {
    setStepError(null);
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, ...updated, step_order: i } : step
      )
    );
  };

  const removeStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    setSteps(updatedSteps.map((step, i) => ({ ...step, step_order: i })));
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex !== null && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: journeyData, error: journeyErr } = await supabase
        .from("journeys")
        .insert([{ order_id: selectedSite, name: journeyName }])
        .select()
        .single();

      if (journeyErr) throw journeyErr;

      const journeyId = journeyData.id;

      const stepsPayload = steps.map((step) => ({
        journey_id: journeyId,
        ...step,
      }));

      const { error: stepsErr } = await supabase
        .from("steps")
        .insert(stepsPayload);

      if (stepsErr) throw stepsErr;

      setSuccess(true);
      setSteps([]);
      setJourneyName("");
      setSelectedStepIndex(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const allStepsValid =
    steps.length >= 2 &&
    steps.every(
      (step) => step.trigger.trim().length > 0 && step.value.trim().length > 0
    );

  return (
    <div className="p-5 bg-primary-foreground dark:bg-transparent min-h-full space-y-6">
      <div>
        <TooltipIcon
          trigger={
            <label className="block text-primary/70 text-sm font-medium mb-1 cursor-help">
              Journey Name
            </label>
          }
          side="right"
          content={"Give your journey an identifying name"}
        />
        <input
          type="text"
          value={journeyName}
          onChange={(e) => setJourneyName(e.target.value)}
          placeholder="e.g. Onboarding Flow"
          className="w-full border px-3 py-2 dark:bg-secondary-background text-primary/70"
        />
      </div>

      {/* Steps Overview */}
      <div>
        <TooltipIcon
          side="right"
          trigger={
            <h3 className="text-sm font-semibold mb-2">
              Steps ({steps.length})
            </h3>
          }
          maxWidth="400px"
          content="Steps are journey milestones you configure to track user's progress"
        />

        <div className="flex overflow-x-auto space-x-4 pb-2">
          {steps.map((step, index) => (
            <div
              key={index}
              onClick={() => setSelectedStepIndex(index)}
              className={`min-w-[200px] max-w-[200px] bg-gray-100 border rounded-md p-3 relative cursor-pointer ${
                selectedStepIndex === index
                  ? "bg-secondary-background/10 dark:bg-white/70"
                  : ""
              }`}
            >
              <button
                className="absolute top-1 right-1 hover:bg-gray-200 cursor-pointer px-1.5 rounded-full text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStep(index);
                }}
              >
                ✖
              </button>
              <p className="font-medium text-sm mb-1 text-primary dark:text-black truncate">
                Step {index + 1}
              </p>
              <div className="text-xs text-gray-700 space-y-1 truncate">
                <div className="truncate">Trigger: {step.trigger}</div>
                <div className="truncate">Value: {step.value || "–"}</div>
                <div className="truncate">Event: {step.event}</div>
              </div>
            </div>
          ))}

          {/* Add Step */}
          <button
            onClick={addStep}
            className="min-w-[120px] bg-blue-100 hover:bg-blue-200 text-blue-700 p-3 rounded-md"
          >
            ➕ Add Step
          </button>
        </div>
        {stepError && (
          <p className="text-xs text-orange-500 mt-1">{stepError}</p>
        )}
      </div>

      {/* Step Inputs (Editable Fields for selected step) */}
      {selectedStepIndex !== null && steps[selectedStepIndex] && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">
            Edit Step {selectedStepIndex + 1}
          </h4>
          {[
            {
              field: "trigger",
              required: true,
              placeholder: "e.g. text, selector, click",
            },
            {
              field: "value",
              required: true,
              placeholder: "e.g. Submit, #signup-form, login",
            },
            {
              field: "selector",
              required: false,
              placeholder: "e.g. #btn-submit, .header-nav",
            },
            {
              field: "event",
              required: false,
              placeholder: "e.g. click, input, hover",
            },
            {
              field: "match_type",
              required: false,
              placeholder: "e.g. exact, contains, regex",
            },
            {
              field: "page_path",
              required: false,
              placeholder: "e.g. /pricing, /login",
            },
          ].map(({ field, required, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium capitalize text-primary/70 mb-1">
                {field.replace("_", " ")}{" "}
                <span
                  className={required ? "text-red-500/70" : "text-primary/70"}
                >
                  ({required ? "required" : "optional"})
                </span>
              </label>
              <input
                type="text"
                value={(steps[selectedStepIndex] as any)[field] || ""}
                onChange={(e) =>
                  updateStep(selectedStepIndex, { [field]: e.target.value })
                }
                className="w-full border px-3 py-2 placeholder:text-primary/20"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          onClick={handleSubmit}
          disabled={loading || !journeyName.trim() || !allStepsValid}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Journey"}
        </button>
      </div>

      {/* Feedback */}
      {error && <p className="text-red-600">{error}</p>}
      {success && <p className="text-green-600">✅ Journey saved!</p>}
    </div>
  );
}
