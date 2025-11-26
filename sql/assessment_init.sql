-- Assessment schema: categories, aspects, criteria, assessments, assessment_answers
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aspects (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(category_id, code)
);

CREATE TABLE IF NOT EXISTS criteria (
  id SERIAL PRIMARY KEY,
  aspect_id INTEGER NOT NULL REFERENCES aspects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  explanation TEXT,
  weight NUMERIC(6,2) NOT NULL,
  UNIQUE(aspect_id, code)
);

CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_answers (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  criteria_id INTEGER NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  answer INTEGER NOT NULL CHECK (answer IN (0,1)),
  score NUMERIC(7,3) NOT NULL
);

-- Insert categories
INSERT INTO categories(code, name) VALUES
('A', 'General'),
('B', 'Prevention'),
('C', 'Preparedness'),
('D', 'Response')
ON CONFLICT (code) DO NOTHING;

-- Insert aspects
WITH cat AS (
  SELECT id, code FROM categories
)
INSERT INTO aspects(category_id, code, name)
VALUES
((SELECT id FROM cat WHERE code='A'), 'A.1', 'Organizational Availability'),
((SELECT id FROM cat WHERE code='A'), 'A.2', 'Availability of Emergency Response Budget'),
((SELECT id FROM cat WHERE code='B'), 'B.1', 'Availability of LB3 Emergency Program'),
((SELECT id FROM cat WHERE code='B'), 'B.2', 'Availability of Facilities and Equipment'),
((SELECT id FROM cat WHERE code='B'), 'B.3', 'Periodic Maintenance'),
((SELECT id FROM cat WHERE code='B'), 'B.4', 'Emergency Procedure Socialization'),
((SELECT id FROM cat WHERE code='C'), 'C.1', 'Training and Drill Execution'),
((SELECT id FROM cat WHERE code='C'), 'C.2', 'Compliance with Preparedness Program'),
((SELECT id FROM cat WHERE code='C'), 'C.3', 'Training & Drill Facilities'),
((SELECT id FROM cat WHERE code='D'), 'D.1', 'Early Warning System'),
((SELECT id FROM cat WHERE code='D'), 'D.2', 'Rescue Operations')
ON CONFLICT DO NOTHING;

-- Insert criteria (mapping aspect codes to their criteria)
-- A.1
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='A.1'), 'A.1.1', 'Has an LB3 Emergency Team with duties according to the B3/LB3 handled', 'Supported by documentation of organization, team formation, or organizational structure', 5.71)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='A.1'), 'A.1.2', 'Emergency Team supported by competent personnel', 'Proven by certificates or emergency training evidence', 5.20)
ON CONFLICT DO NOTHING;

-- A.2
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='A.2'), 'A.2.1', 'Has budget allocation for LB3 emergency system', 'Evidenced by work plan and annual budget', 11.58)
ON CONFLICT DO NOTHING;

-- B.1
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.1'), 'B.1.1', 'Has LB3 Emergency Program', 'Can show program document', 1.97)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.1'), 'B.1.2', 'Has Risk Identification Document with information on B3/LB3 characteristics, quantity, etc.', 'Supporting documents include logbook, waste balance', 2.41)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.1'), 'B.1.3', 'Emergency program prepared according to LB3 guidelines', 'Document content matches guideline format', 1.69)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.1'), 'B.1.4', 'Emergency program aligned with Risk Identification Document', 'Risk identification includes B3 type, hazard potential, accidents, SOP', 1.76)
ON CONFLICT DO NOTHING;

-- B.2
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.1', 'Has LB3 Emergency Control Center', 'Could be a room, workstation, or command post', 1.07)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.2', 'Has health facilities', 'Clinic, first aid tools, emergency kit, stretcher, etc.', 0.91)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.3', 'Has emergency SOPs', 'Emergency SOP documents available', 1.17)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.4', 'Has evacuation routes or muster point information', 'Evacuation routes or muster point available', 0.92)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.5', 'Has early warning system', 'Alarm, siren, gas detector, leak detector', 1.18)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.6', 'Has Personal Protective Equipment', '—', 1.07)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.7', 'Has emergency response equipment', 'Such as APAR, spill kit, foam, etc.', 1.21)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.8', 'Has wind direction indicator', 'e.g., windsock', 0.76)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.2'), 'B.2.9', 'Has emergency communication tools', 'Used to notify workers/community', 0.98)
ON CONFLICT DO NOTHING;

-- B.3
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.3'), 'B.3.1', 'Conducts periodic maintenance', 'Maintenance plans or reports available', 6.23)
ON CONFLICT DO NOTHING;

-- B.4
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='B.4'), 'B.4.1', 'Conducts socialization of emergency procedures', 'Documented socialization evidence available', 5.42)
ON CONFLICT DO NOTHING;

-- C.1
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='C.1'), 'C.1.1', 'Conducts training and drills at least once a year', 'Documentation of training and drills', 9.27)
ON CONFLICT DO NOTHING;

-- C.2
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='C.2'), 'C.2.1', 'Training aligned with emergency program', 'Evidence that training matches hazard potential', 6.96)
ON CONFLICT DO NOTHING;

-- C.3
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='C.3'), 'C.3.1', 'Has training & drill schedule', 'Can show annual schedule', 2.17)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='C.3'), 'C.3.2', 'Can provide training modules', 'Proof of module availability', 2.26)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='C.3'), 'C.3.3', 'Can provide competent instructors', 'Proof of instructor competency', 2.33)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='C.3'), 'C.3.4', 'Can provide training equipment', 'Equipment availability evidence', 2.43)
ON CONFLICT DO NOTHING;

-- D.1
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='D.1'), 'D.1.1', 'Early detection of potential emergencies', 'Gas detector, leakage detector, etc.', 4.69)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='D.1'), 'D.1.2', 'Response to detection within < 1 hour', 'Evidence of initial response', 3.79)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='D.1'), 'D.1.3', 'Announcement to workers/community < 30 minutes', 'Evidence of notification', 3.62)
ON CONFLICT DO NOTHING;

-- D.2
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='D.2'), 'D.2.1', 'Injury/fatality handled < 10 minutes', 'Evidence of immediate response', 5.61)
ON CONFLICT DO NOTHING;
INSERT INTO criteria(aspect_id, code, description, explanation, weight)
VALUES ((SELECT a.id FROM aspects a WHERE a.code='D.2'), 'D.2.2', 'Evacuation within < 30 minutes', 'Evidence of evacuation', 5.61)
ON CONFLICT DO NOTHING;
