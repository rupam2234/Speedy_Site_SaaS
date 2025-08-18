import { CruxData, DailyCrux, PageCrux } from "@/data/cruxData";

// to fetch crux for gsc pages
export async function pageCrux(page: string) {
  const API_KEY = process.env.NEXT_PUBLIC_CrUXHistoryAPI;
  const API_URL = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${API_KEY}`;
  const FORM_FACTORS = ["DESKTOP", "PHONE"] as const;

  if (!page || !API_KEY) {
    console.warn("Missing 'page' parameter or CrUX API key.");
    return null;
  }

  const fetchCrUXForPage = async (formFactor: string) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: page,
          metrics: [
            "largest_contentful_paint",
            "cumulative_layout_shift",
            "interaction_to_next_paint",
            "experimental_time_to_first_byte",
          ],
          formFactor,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`CrUX API error (${formFactor}):`, error);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch CrUX data for ${formFactor}:`, error);
      return null;
    }
  };

  try {
    const results = await Promise.all(FORM_FACTORS.map(fetchCrUXForPage));

    const filtered = results.filter((item) => !!item);
    const parsedData: PageCrux[] = filtered.map((x: any) => ({
      device_type:
        x?.record?.key?.formFactor === "PHONE" ? "Mobile" : "Desktop",
      page_address: page,
      record: x.record,
    }));

    return {
      parsedData,
    };
  } catch (err) {
    console.error("Unexpected error in pageCrux:", err);
    return null;
  }
}

// to fetch daily crux for domains
export async function fetchDailyCrux(
  selectedSite: string,
  setDailyCrux: (data: DailyCrux[]) => void
) {
  const APIkey = process.env.NEXT_PUBLIC_CrUXHistoryAPI;
  const formFactors = ["DESKTOP", "PHONE"] as const;

  if (!selectedSite) {
    console.warn("Missing website address");
    setDailyCrux([]);
    return;
  }

  if (!APIkey) {
    console.warn("Missing CrUX API key");
    setDailyCrux([]);
    return;
  }

  const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${APIkey}`;

  const fetchMetricsForFormFactor = async (formFactor: string) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: `https://${selectedSite}`,
          metrics: [
            "largest_contentful_paint",
            "cumulative_layout_shift",
            "interaction_to_next_paint",
            "experimental_time_to_first_byte",
          ],
          formFactor,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error(`CrUX API error for ${formFactor}:`, error);
        return null;
      }

      return await res.json();
    } catch (err) {
      console.error(`Fetch failed for ${formFactor}:`, err);
      return null;
    }
  };

  try {
    const data = await Promise.all(formFactors.map(fetchMetricsForFormFactor));
    const filtered = data.filter(Boolean);

    if (filtered.length === 0) {
      setDailyCrux([]);
      return;
    }

    const parsedData: DailyCrux[] = filtered.map((item: any) => ({
      website_name: selectedSite,
      device_type:
        item.record.key.formFactor === "PHONE" ? "Mobile" : "Desktop",
      record: item.record, // ✅ Include full CruxRecord here
    }));

    setDailyCrux(parsedData);
  } catch (error) {
    console.error("Unexpected error fetching CrUX data:", error);
    setDailyCrux([]);
  }
}

// for crux history data
export async function fetchCrUXData(
  selectedSite: string,
  setCruxData: (crux: CruxData[]) => void
) {
  const APIkey = process.env.NEXT_PUBLIC_CrUXHistoryAPI;

  if (!APIkey) {
    console.log("CrUX API key is missing");
    return;
  } else {
    const address = `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${APIkey}`;
    const formFactors: string[] = ["DESKTOP", "PHONE"];

    try {
      // Use Promise.all to handle async requests
      const responses = await Promise.all([
        // Requests for formFactors: DESKTOP and PHONE
        ...formFactors.map((formFactor) =>
          fetch(address, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              origin: `https://${selectedSite}`,
              metrics: [
                "largest_contentful_paint",
                "cumulative_layout_shift",
                "interaction_to_next_paint",
                "experimental_time_to_first_byte",
              ],
              formFactor: formFactor,
            }),
          })
        ),
        // The third request without formFactor, including form_factors within metrics
        fetch(address, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin: `https://${selectedSite}`,
            metrics: [
              "largest_contentful_paint",
              "cumulative_layout_shift",
              "interaction_to_next_paint",
              "experimental_time_to_first_byte",
              "form_factors", // Including form_factors in the metrics
            ],
          }),
        }),
      ]);

      const data = await Promise.all(
        responses.map(async (response) => {
          if (!response.ok) {
            const errorDetails = await response.json();
            console.log("Response error details:", errorDetails);
            return { status: response.status, data: null };
          }
          return { status: response.status, data: await response.json() };
        })
      );

      // Check if all responses are 404
      const allResponses404 = data.every((item) => item.status === 404);

      if (allResponses404) {
        setCruxData([]);
      } else {
        const validData: any = data
          .filter((item) => item.data !== null)
          .map((item) => item.data);

        setCruxData(validData);
      }
    } catch (error) {
      console.log("Error during CrUX fetch:", error);
      setCruxData([]); // Reset on error
    }
  }
}
