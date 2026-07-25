import {describe,expect,it} from "vitest";import {criticalPath} from "./scheduling";import type {Activity} from "./domain";
const a=(id:string,start:string,end:string,dependencies:string[]=[]):Activity=>({id,projectId:"p",name:id,sequence:1,plannedStart:start,plannedEnd:end,progress:0,status:"NOT_STARTED",dependencyIds:dependencies,paymentMode:"FIXED",paymentValue:0,retentionPct:0,gstPct:0});
import {calculateProjectSlippage, tatStatus} from "./scheduling";

describe("tatStatus", () => {
  const raisedAt = "2026-07-20T00:00:00Z";
  const dueAt = "2026-07-22T00:00:00Z"; // 48h window
  const stage = (now: string) => ({ state: "MANUFACTURER" as const, raisedAt, dueAt, decisions: [{ id: "d1", actorId: "u1", role: "CONTRACTOR" as const, decision: "RAISED" as const, createdAt: raisedAt }] });

  it("is ON_TRACK before 50% elapsed", () => {
    const r = tatStatus(stage("x"), new Date("2026-07-20T12:00:00Z")); // 25%
    expect(r.tier).toBe("ON_TRACK");
  });
  it("is WARNING at 50%+ elapsed", () => {
    const r = tatStatus(stage("x"), new Date("2026-07-21T00:00:00Z")); // 50%
    expect(r.tier).toBe("WARNING");
  });
  it("is OVERDUE once past dueAt", () => {
    const r = tatStatus(stage("x"), new Date("2026-07-22T01:00:00Z")); // ~102%
    expect(r.tier).toBe("OVERDUE");
  });
  it("is ESCALATED at 150%+ elapsed", () => {
    const r = tatStatus(stage("x"), new Date("2026-07-23T00:00:00Z")); // 150%
    expect(r.tier).toBe("ESCALATED");
  });
  it("is always ON_TRACK for terminal states", () => {
    expect(tatStatus({ state: "PAID", raisedAt, dueAt, decisions: [] }).tier).toBe("ON_TRACK");
    expect(tatStatus({ state: "REWORK", raisedAt, dueAt, decisions: [] }).tier).toBe("ON_TRACK");
  });
});

describe("critical path",()=>it("selects the longest dependency chain",()=>{const r=criticalPath([a("a","2026-01-01","2026-01-03"),a("b","2026-01-04","2026-01-08",["a"]),a("c","2026-01-01","2026-01-04")]);expect(r.path).toEqual(["a","b"]);expect(r.duration).toBe(8);}));

describe("schedule slippage tracking", () => {
  const project = { id: "p", startDate: "2026-07-01", endDate: "2026-08-30" };

  it("calculates zero slippage when on track", () => {
    const activities = [
      { id: "1", sequence: 1, plannedStart: "2026-07-01", plannedEnd: "2026-07-10", status: "PAID" },
    ];
    const stages = [
      { activityId: "1", decisions: [{ createdAt: "2026-07-10T12:00:00Z" }] }
    ];
    const res = calculateProjectSlippage(project, activities, stages);
    expect(res.slippageDays).toBe(0);
    expect(res.status).toBe("ON_TRACK");
    expect(res.projectedEndDate).toBe("2026-08-30");
  });

  it("calculates ahead of schedule for early completions", () => {
    const activities = [
      { id: "1", sequence: 1, plannedStart: "2026-07-01", plannedEnd: "2026-07-10", status: "PAID" },
    ];
    const stages = [
      { activityId: "1", decisions: [{ createdAt: "2026-07-07T12:00:00Z" }] }
    ];
    const res = calculateProjectSlippage(project, activities, stages);
    expect(res.slippageDays).toBe(-3);
    expect(res.status).toBe("AHEAD");
    expect(res.projectedEndDate).toBe("2026-08-27");
  });

  it("calculates behind schedule for late completions and active overdue tasks", () => {
    const activities = [
      { id: "1", sequence: 1, plannedStart: "2026-07-01", plannedEnd: "2026-07-10", status: "PAID" },
      { id: "2", sequence: 2, plannedStart: "2026-07-11", plannedEnd: "2026-07-15", status: "IN_PROGRESS" }
    ];
    const stages = [
      { activityId: "1", decisions: [{ createdAt: "2026-07-12T12:00:00Z" }] } // 2 days late
    ];
    // Set today to past plannedEnd of activity 2 (e.g. 2026-07-18)
    const originalDate = Date.now;
    const mockToday = new Date("2026-07-18T12:00:00Z").getTime();
    global.Date.now = () => mockToday;
    
    // Stub global Date constructor for 'new Date()' to return mock date when called empty
    const realDate = global.Date;
    // @ts-ignore
    global.Date = class extends realDate {
      constructor(val?: any) {
        if (val === undefined) {
          super(mockToday);
        } else {
          super(val);
        }
      }
    };

    try {
      const res = calculateProjectSlippage(project, activities, stages);
      expect(res.slippageDays).toBe(5); // +2 from completed, +3 from active overdue (18 - 15)
      expect(res.status).toBe("BEHIND");
      expect(res.projectedEndDate).toBe("2026-09-04");
    } finally {
      global.Date = realDate;
      Date.now = originalDate;
    }
  });

  it("handles parallel active overdue tasks by selecting maximum delay", () => {
    const activities = [
      { id: "1", sequence: 1, plannedStart: "2026-07-01", plannedEnd: "2026-07-10", status: "IN_PROGRESS" },
      { id: "2", sequence: 2, plannedStart: "2026-07-01", plannedEnd: "2026-07-08", status: "IN_PROGRESS" }
    ];
    const mockToday = new Date("2026-07-12T12:00:00Z").getTime();
    const realDate = global.Date;
    // @ts-ignore
    global.Date = class extends realDate {
      constructor(val?: any) {
        if (val === undefined) {
          super(mockToday);
        } else {
          super(val);
        }
      }
    };

    try {
      const res = calculateProjectSlippage(project, activities, []);
      expect(res.slippageDays).toBe(4); // max(12-10=2, 12-8=4) = 4 days
      expect(res.status).toBe("BEHIND");
    } finally {
      global.Date = realDate;
    }
  });
});
