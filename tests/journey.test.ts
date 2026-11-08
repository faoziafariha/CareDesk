import {it,expect} from 'vitest';
import {initialNetwork,upgradeNetwork,updateNetwork,type NetworkState} from '../src/network/store';
import {patientTimeline,timelineCsv} from '../src/network/journey';
import type {User} from '../src/types';
const user=(role:User['role']):User=>({uid:'demo-'+role,role,email:'demo@example.test'});
it('upgrades old browser records without replacing consent or pharmacy decisions',()=>{
 const full=initialNetwork();
 const old:NetworkState={...full,fixtureRevision:1,pharmacies:full.pharmacies.slice(0,3),reports:full.reports.slice(0,3),prescriptions:full.prescriptions.slice(0,2),interventions:full.interventions.slice(0,2),consents:full.consents.slice(0,6),profiles:[],goals:[],appointments:[]};
 old.consents[0].pharmacy=false;old.pharmacies[2].status='active';
 const upgraded=upgradeNetwork(old);
 expect(upgraded.consents[0].pharmacy).toBe(false);
 expect(upgraded.pharmacies.find(p=>p.id==='ph-1003')?.status).toBe('active');
 expect(upgraded.goals).toHaveLength(24);expect(upgraded.appointments).toHaveLength(24);expect(upgraded.reports).toHaveLength(51);
 expect(upgradeNetwork(upgraded)).toBe(upgraded);expect(upgraded.events).toEqual([]);
});
it('scopes task changes and protects requested and cancelled appointment transitions',()=>{
 const initial=initialNetwork();
 const goal=updateNetwork(initial,user('patient'),{type:'addGoal',patientId:'p-1001',title:'Prepare questions',description:'Fictional task',dueDate:'2027-01-01'});
 expect(goal.goals).toHaveLength(25);
 expect(()=>updateNetwork(goal,user('patient'),{type:'setGoalStatus',patientId:'p-1002',goalId:goal.goals[0].id,status:'completed'})).toThrow();
 const requested=updateNetwork(initial,user('patient'),{type:'bookAppointment',patientId:'p-1001',title:'Demo visit',mode:'Telephone',scheduledAt:new Date(Date.now()+86400000).toISOString(),note:''});
 const ap=requested.appointments[0];expect(ap.status).toBe('requested');
 expect(()=>updateNetwork(requested,user('patient'),{type:'setAppointmentStatus',patientId:'p-1001',appointmentId:ap.id,status:'completed'})).toThrow();
 const confirmed=updateNetwork(requested,user('clinician'),{type:'setAppointmentStatus',patientId:'p-1001',appointmentId:ap.id,status:'scheduled'});
 const cancelled=updateNetwork(confirmed,user('patient'),{type:'setAppointmentStatus',patientId:'p-1001',appointmentId:ap.id,status:'cancelled'});
 expect(cancelled.appointments[0].status).toBe('cancelled');
 expect(()=>updateNetwork(cancelled,user('clinician'),{type:'setAppointmentStatus',patientId:'p-1001',appointmentId:ap.id,status:'scheduled'})).toThrow();
});
it('scopes timeline exports and escapes spreadsheet formulas',()=>{
 const state=initialNetwork();const rows=patientTimeline(state,user('patient'),'p-1001');
 expect(rows.length).toBeGreaterThan(10);expect(patientTimeline(state,user('patient'),'p-1002')).toEqual([]);
 const revoked=updateNetwork(state,user('patient'),{type:'consent',patientId:'p-1001',provider:true,pharmacy:false});
 expect(patientTimeline(revoked,user('pharmacist'),'p-1001')).toEqual([]);
 const csv=timelineCsv([{...rows[0],title:'=1+1',detail:'a, "quoted" value'}]);
 expect(csv).toContain('"\'=1+1"');expect(csv).toContain('""quoted""');
});
