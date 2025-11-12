import { useState, useEffect } from "react";
import moment, { Moment } from "moment";

export const useNow = (override?: string | Date | Moment): Moment => {
  const [now, setNow] = useState(() =>
    override ? moment.utc(override) : moment.utc().subtract(3, "hours")
  );

  useEffect(() => {
    if (override) {
      setNow(moment.utc(override));
      return;
    }

    const updateNow = () => setNow(moment.utc().subtract(3, "hours"));

    // Update every minute
    const interval = setInterval(updateNow, 60000);

    return () => clearInterval(interval);
  }, [override]);

  return now;
};
