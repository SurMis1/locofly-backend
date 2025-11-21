const express = require('express');
const db = require('./db');
const router = express.Router();

// Helper for safe integer conversion
function toInt(val) {
  const n = Number.parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

/* ======================================================
   CREATE LOCATION
====================================================== */
router.post('/locations', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const q = await db.query(
      `INSERT INTO locations (name) VALUES ($1) RETURNING *`,
      [name]
    );

    res.json(q.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ======================================================
   LIST LOCATIONS
====================================================== */
router.get('/locations', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name FROM locations ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/* ======================================================
   ADD ITEM
====================================================== */
router.post('/items', async (req, res, next) => {
  try {
    const { item_name, quantity, barcode, location_id } = req.body;

    if (!item_name || !location_id)
      return res.status(400).json({ error: "item_name and location_id required" });

    const q = await db.query(
      `INSERT INTO inventory (item_name, quantity, location_id, barcode, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [item_name, quantity || 0, location_id, barcode || null]
    );

    res.json(q.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ======================================================
   EDIT ITEM (supports quantity)
====================================================== */
router.put('/items/:id', async (req, res, next) => {
  try {
    const id = toInt(req.params.id);
    const { item_name, barcode, quantity } = req.body;

    const q = await db.query(
      `UPDATE inventory
          SET item_name = COALESCE($1, item_name),
              barcode   = COALESCE($2, barcode),
              quantity  = COALESCE($3, quantity),
              updated_at = NOW()
        WHERE id = $4
        RETURNING *`,
      [
        item_name,
        barcode,
        quantity === undefined ? null : quantity,
        id
      ]
    );

    if (q.rows.length === 0)
      return res.status(404).json({ error: "item not found" });

    res.json(q.rows[0]);

  } catch (err) {
    next(err);
  }
});

/* ======================================================
   LOCATION INVENTORY
====================================================== */
router.get('/inventory', async (req, res, next) => {
  try {
    const locationId = toInt(req.query.location_id);
    const search = (req.query.query || '').trim();

    if (!locationId)
      return res.status(400).json({ error: 'location_id is required' });

    const params = [locationId];
    let sql = `
      SELECT id, item_name, quantity, location_id, updated_at, barcode
      FROM inventory
      WHERE location_id = $1
    `;

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      params.push(search);
      sql += `
        AND (
          LOWER(item_name) LIKE $2
          OR barcode = $3
        )
      `;
    }

    sql += ' ORDER BY item_name ASC';

    const result = await db.query(sql, params);
    res.json(result.rows);

  } catch (err) {
    next(err);
  }
});

/* ======================================================
   GLOBAL SEARCH (correct JOIN)
====================================================== */
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    const result = await db.query(
      `SELECT i.*,
              l.name AS location_name
         FROM inventory i
         JOIN locations l ON l.id = i.location_id
        WHERE i.item_name ILIKE $1
           OR i.barcode = $2
        ORDER BY i.item_name
        LIMIT 50`,
      [`%${q}%`, q]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/* ======================================================
   FIXED — SINGLE ITEM QUANTITY ADJUST (for +1 / -1)
====================================================== */
router.post('/inventory/adjust', async (req, res, next) => {
  try {
    const { location_id, items } = req.body || {};
    const locationId = toInt(location_id);

    if (!locationId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'location_id and items[] are required' });
    }

    const item = items[0] || {};
    const id = toInt(item.id);
    const delta = Number(item.delta || 0);

    if (!id || !delta) {
      return res.json({ updated: [] });
    }

    const sql = `
      UPDATE inventory
         SET quantity   = quantity + $1,
             updated_at = NOW()
       WHERE id = $2
         AND location_id = $3
       RETURNING id, item_name, quantity, location_id, updated_at, barcode
    `;

    const result = await db.query(sql, [delta, id, locationId]);
    return res.json({ updated: result.rows });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
