import { describe, expect, it } from "vitest";
import { createStage, decide } from "./workflow";
import type { Activity, Project } from "./domain";
const project: Project = { id:"project",tenantId:"tenant",name:"Mock Project",address:"123 Street",scope:"Painting",buildings:1,areaSqft:1000,contractValue:1000,startDate:"2026-01-01",endDate:"2026-01-02",status:"ACTIVE",contractorId:"contractor",manufacturerId:"mfg",consultantId:"pmc",clientId:"client" };
const activity: Activity = { id:"activity",projectId:"project",name:"Primer",sequence:1,plannedStart:"2026-01-01",plannedEnd:"2026-01-02",progress:0,status:"IN_PROGRESS",dependencyIds:[],paymentMode:"FIXED",paymentValue:1000,retentionPct:10,gstPct:18 };
describe("approval workflow",()=>{
  it("moves a submitted stage through the prescribed chain",()=>{
    const stage=createStage(activity,project,"contractor",["photo"],{quality:true});
    expect(stage.state).toBe("MANUFACTURER");
    // Assert 48h default TAT
    const expectedDue = new Date();
    expectedDue.setHours(expectedDue.getHours() + 48);
    const stageDue = new Date(stage.dueAt);
    expect(Math.abs(stageDue.getTime() - expectedDue.getTime())).toBeLessThan(5000);

    decide(stage,project,"mfg","MANUFACTURER","APPROVE");
    expect(stage.state).toBe("CONSULTANT");
    
    // Assert dueAt is reset to 48h from decision
    const expectedDue2 = new Date();
    expectedDue2.setHours(expectedDue2.getHours() + 48);
    const stageDue2 = new Date(stage.dueAt);
    expect(Math.abs(stageDue2.getTime() - expectedDue2.getTime())).toBeLessThan(5000);

    decide(stage,project,"pmc","CONSULTANT","APPROVE");
    expect(stage.state).toBe("CLIENT");
    decide(stage,project,"client","CLIENT","APPROVE");
    expect(stage.state).toBe("AWAITING_RECEIPT");
    decide(stage,project,"contractor","CONTRACTOR","APPROVE");
    expect(stage.state).toBe("PAID");
    expect(stage.amountDue).toBe(1080);
  });
  it("prevents an out-of-order approval",()=>{
    const stage=createStage(activity,project,"contractor",[],{});
    expect(()=>decide(stage,project,"client","CLIENT","APPROVE")).toThrow("Only the MANUFACTURER");
  });
});
