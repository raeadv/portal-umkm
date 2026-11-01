import { http } from "@/lib/http-client";
import { useEffect, useState } from "react";

// Fetches a dropdown list. `params` is the query string, or a falsy value to skip (parent not
// chosen yet). Ignores a response that arrives after the parent changed again.
export function useOptions(path, key, params, valueKey = "kode", labelKey = "nama") {
  const [options, setOptions] = useState([]);
  const dep = JSON.stringify(params || null);

  useEffect(() => {
    if (!params) {
      setOptions([]);
      return;
    }

    let stale = false;
    http
      .get(path, { params, silent: true })
      .then((res) => {
        if (stale) return;
        setOptions(
          res.data[key].map((item) => ({
            value: String(item[valueKey]),
            label: item[labelKey],
          })),
        );
      })
      .catch((err) => console.error("error loading " + path + ": ", err));

    return () => {
      stale = true;
    };
  }, [path, dep]);

  return options;
}
