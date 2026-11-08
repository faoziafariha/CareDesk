import {it,expect} from 'vitest';
import fixtures from '../fixtures/clinic.json';
it('keeps all fictional notes and encounters linked to valid parents',()=>{
 const patients=new Set(fixtures.patients.map(p=>p.id));
 const encounters=new Set(fixtures.encounters.map(e=>e.id));
 expect(patients.size).toBe(12);
 expect(encounters.size).toBe(24);
 expect(new Set(fixtures.notes.map(n=>n.id)).size).toBe(23);
 for(const e of fixtures.encounters)expect(patients.has(e.patientId)).toBe(true);
 for(const n of fixtures.notes){expect(encounters.has(n.encounterId)).toBe(true);expect(n.text).toContain('SYNTHETIC TRAINING RECORD');}
 for(const e of fixtures.encounters.filter(e=>e.status==='signed'))expect(fixtures.notes.some(n=>n.encounterId===e.id)).toBe(true);
 expect(fixtures.notes.some(n=>n.encounterId==='e-1001')).toBe(false);
});
