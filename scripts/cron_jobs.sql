INSERT INTO roles (role_name, role_description, created_at)
VALUES
('SUPER_ADMIN', 'Full system access', NOW()),
('ADMIN', 'Administrative access', NOW()),
('FACULTY', 'Faculty access', NOW()),
('STUDENT', 'Student access', NOW()),
('PLACEMENT_OFFICER', 'Placement management access', NOW()),
('HOD', 'Head of department access', NOW())
ON CONFLICT (role_name) DO NOTHING;