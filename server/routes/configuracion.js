import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM configuracion_empresa ORDER BY id_configuracion LIMIT 1');
    res.json(r.rows[0] || { nombre: 'El Pelú' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/', async (req, res) => {
  const { nombre, rnc, direccion, telefono, correo, mensaje_pie } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const existente = await pool.query('SELECT id_configuracion FROM configuracion_empresa LIMIT 1');
    let r;
    if (existente.rows.length === 0) {
      r = await pool.query(
        'INSERT INTO configuracion_empresa (nombre, rnc, direccion, telefono, correo, mensaje_pie) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [nombre, rnc, direccion, telefono, correo, mensaje_pie]
      );
    } else {
      r = await pool.query(
        'UPDATE configuracion_empresa SET nombre=$1, rnc=$2, direccion=$3, telefono=$4, correo=$5, mensaje_pie=$6 WHERE id_configuracion=$7 RETURNING *',
        [nombre, rnc, direccion, telefono, correo, mensaje_pie, existente.rows[0].id_configuracion]
      );
    }
    res.json(r.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

export default router;
