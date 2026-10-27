-- Datos sintéticos opcionales. No se ejecutan al arrancar el servidor.
begin;
insert into public.nexo_clients(id,name,email,sector) values
('c1','Estudio Horizonte','hola@horizonte.example','Diseño'),
('c2','Órbita Digital','equipo@orbita.example','Tecnología'),
('c3','Raíz Cooperativa','hola@raiz.example','Comercio'),
('c4','Atlas Consultoría','equipo@atlas.example','Servicios')
on conflict do nothing;
insert into public.nexo_projects(id,name,client_id,budget,status,due_date,progress) values
('p1','Nueva identidad de marca','c1',8400,'En curso','2026-11-20',65),
('p2','Portal de clientes','c2',18500,'En curso','2026-12-10',40),
('p3','Tienda online sostenible','c3',12500,'Pendiente','2026-12-22',0),
('p4','Auditoría de experiencia','c4',6200,'Completado','2026-10-08',100),
('p5','Sistema de diseño','c2',9600,'En curso','2026-11-30',75),
('p6','Campaña de lanzamiento','c1',4800,'Pendiente','2026-12-15',0)
on conflict do nothing;
commit;
