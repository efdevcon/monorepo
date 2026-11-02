import assert from "node:assert/strict";
import { test } from "node:test";
import { AREA_LIST } from "./resolve";
import { AREA_PARAM, parseAreaParam, SWAG_STATION_MAP_HREF } from "./roomAreas";

test("the swag modal's Swag Station link points at a footprint the plan draws", () => {
  const param = new URL(SWAG_STATION_MAP_HREF, "https://app.devcon.org").searchParams.get(AREA_PARAM);
  const target = parseAreaParam(param ?? "");
  assert.ok(target, "a well-formed area param");
  const keys = new Set(AREA_LIST.map((a) => a.key));
  for (const key of target.keys) assert.ok(keys.has(key), `${key} is in the plan`);
  assert.equal(AREA_LIST.find((a) => a.key === target.keys[0])?.areaId, "swag-station");
});
