const db = require("../models");
const Delivery = db.deliveries;
const User = db.users;
const Status = db.statuses;
const Op = db.Sequelize.Op;
const { fn, col, literal } = db.Sequelize;
const DeliveryItem = db.delivery_items;
const multer = require('multer'); // ADD THIS LINE

const Good = db.goods;
const moment = require("moment-timezone"); // <-- Add this line
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2; // Make sure cloudinary is configured
const { DRIVER_FEE_PER_DELIVERY } = require("../constants/delivery");
const { TIMEZONE, ubDayRange, ubTodayRange, toDateKey, isYmd } = require("../utils/timezone");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

const ubDateExpr = (column) =>
  literal(`DATE("${column}" AT TIME ZONE '${TIMEZONE}')`);


exports.findDriverDeliveriesWithStatus = (req, res) => {
  const driverId = req.params.id;

  Delivery.findAll({
      where: {
          driver_id: driverId,
          status: 2
      }
  })
  .then(data => {
      res.send({
          success: true,
          data: data
      });
  })
  .catch(err => {
      res.status(500).send({
          message: err.message || "Some error occurred while retrieving deliveries."
      });
  });
};

exports.findWithStatus = async (req, res) => {
  const driverId = req.params.id;
  const status = parseInt(req.params.status, 10);

  if (isNaN(status)) {
    return res.status(400).send({ success: false, message: "Invalid status parameter" });
  }

  // Same window as the dashboard: today in Asia/Ulaanbaatar
  const { start, end } = ubTodayRange();
  const dateField = status === 3 ? "delivered_at" : "updatedAt";

  try {
    const data = await Delivery.findAll({
      where: {
        driver_id: driverId,
        status: status,
        is_deleted: false,
        [dateField]: {
          [Op.gte]: start,
          [Op.lte]: end,
        }
      },
      include: [
        {
          model: User,
          as: 'merchant',
          attributes: ['username']
        }
      ],
      logging: (sql, timing) => {
        console.log("Executed SQL:", sql);
        if (timing) console.log("Execution time:", timing, "ms");
      }
    });

    res.send({
      success: true,
      data
    });

  } catch (err) {
    console.error("Error fetching deliveries:", err);
    res.status(500).send({
      success: false,
      message: err.message || "Some error occurred while retrieving deliveries."
    });
  }
};

exports.findDeliveryDone = (req, res) => {
  const driverId = req.params.id;
  const { startDate, endDate } = req.query;

  const range =
    isYmd(startDate) && isYmd(endDate)
      ? ubDayRange(startDate, endDate)
      : ubTodayRange();

  const whereClause = {
    driver_id: driverId,
    status: { [Op.in]: [3, 4, 5] },
    is_deleted: false,
    delivered_at: {
      [Op.between]: [range.start, range.end]
    }
  };

  Delivery.findAll({
    where: whereClause,
    order: [['delivered_at', 'DESC']],
  })
    .then(data => {
      res.send({
        success: true,
        data: data
      });
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving deliveries."
      });
    });
};


exports.findUserDeliveries = (req, res) => {
    const userId = req.query.user_id;
    Delivery.findAll({ where: { driver_id: userId } })
        .then(data => res.send(data))
        .catch(err => res.status(500).send({ message: err.message }));
};


exports.findMerchantDelivery = (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).send({ success: false, message: "Missing user_id" });
  }

  const end = moment.tz(TIMEZONE).endOf("day").toDate();
  const start = moment.tz(TIMEZONE).subtract(6, "days").startOf("day").toDate();

  Delivery.findAll({
    where: {
      merchant_id: userId,
      is_deleted: false,
      createdAt: {
        [Op.between]: [start, end],
      },
    },
    order: [["id", "DESC"]],
  })
    .then((data) => res.send({ success: true, data }))
    .catch((err) =>
      res
        .status(500)
        .send({ success: false, message: err.message || "Error fetching deliveries" })
    );
};
exports.findByDeliverId = async (req, res) => {
    const { deliveryId } = req.params;
  
    try {
      const delivery = await Delivery.findOne({
        where: { delivery_id: deliveryId },
        
      });
  
      if (!delivery) {
        return res.status(404).json({ message: "Delivery not found" });
      }
  
      res.json({ success: true, data: delivery });
    } catch (error) {
      console.error("Error fetching delivery by ID:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  exports.getStatusCountsByDriver = async (req, res) => {
    const driverId = req.params.driver_id;
  
    const { start, end } = ubTodayRange();
  
    try {
      const statuses = await Status.findAll({
        attributes: [
          'id',
          'status',
          'color',
          [
            // Count matching deliveries for this status and driver for today (UB)
            literal(`(
              SELECT COUNT(*)
              FROM deliveries AS d
              WHERE d.status = status.id
                AND d.driver_id = ${parseInt(driverId, 10)}
                AND d.is_deleted = false
                AND d."createdAt" BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'
            )`),
            'count'
          ]
        ],
        order: [['id', 'ASC']]
      });
  
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching full status list with counts:", error);
      res.status(500).json({ error: "Server error", details: error.message });
    }
  };


exports.report = async (req, res) => {
  const { driver_id, start_date, end_date } = req.query;

  if (!isYmd(start_date) || !isYmd(end_date)) {
    return res.status(400).json({ success: false, message: 'start_date and end_date are required (YYYY-MM-DD)' });
  }

  try {
    const driverFilter = {
      ...(driver_id ? { driver_id } : {}),
      is_deleted: false,
    };
    const { start, end } = ubDayRange(start_date, end_date);

    // Assigned that UB day (createdAt)
    const totalDeliveries = await Delivery.findAll({
      where: {
        ...driverFilter,
        createdAt: { [Op.between]: [start, end] },
      },
      attributes: [
        [ubDateExpr('createdAt'), 'date'],
        [fn('COUNT', col('id')), 'total_deliveries'],
      ],
      group: [ubDateExpr('createdAt')],
      raw: true,
    });

    // Completed that UB day (status 3, delivered_at) — salary = count × 8000
    const deliveredStats = await Delivery.findAll({
      where: {
        ...driverFilter,
        status: 3,
        delivered_at: { [Op.between]: [start, end] },
      },
      attributes: [
        [ubDateExpr('delivered_at'), 'date'],
        [fn('COUNT', col('id')), 'delivered_count'],
        [fn('SUM', col('price')), 'delivered_total_price'],
        [literal(`COUNT(*) * ${DRIVER_FEE_PER_DELIVERY}`), 'for_driver'],
        [literal(`SUM(price) - (COUNT(*) * ${DRIVER_FEE_PER_DELIVERY})`), 'driver_margin'],
      ],
      group: [ubDateExpr('delivered_at')],
      raw: true,
    });

    const emptyRow = () => ({
      total_deliveries: 0,
      delivered_count: 0,
      delivered_total_price: 0,
      for_driver: 0,
      driver_margin: 0,
    });

    const resultMap = {};
    totalDeliveries.forEach((item) => {
      const date = toDateKey(item.date);
      if (!date) return;
      resultMap[date] = {
        ...emptyRow(),
        total_deliveries: parseInt(item.total_deliveries, 10) || 0,
      };
    });
    deliveredStats.forEach((item) => {
      const date = toDateKey(item.date);
      if (!date) return;
      if (!resultMap[date]) resultMap[date] = emptyRow();
      resultMap[date].delivered_count = parseInt(item.delivered_count, 10) || 0;
      resultMap[date].delivered_total_price = parseFloat(item.delivered_total_price) || 0;
      resultMap[date].for_driver = parseInt(item.for_driver, 10) || 0;
      resultMap[date].driver_margin = parseFloat(item.driver_margin) || 0;
    });

    const finalData = Object.keys(resultMap)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => ({
        date,
        ...resultMap[date],
      }));

    return res.json({ success: true, data: finalData });
  } catch (error) {
    console.error('Error generating delivery report:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.completeDelivery = async (req, res) => {
  // Use multer to parse the form data first
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).send({
        success: false,
        message: "File upload error: " + err.message,
      });
    }

    // Now process the request
    const id = req.params.id;
    
    console.log('=== DELIVERY COMPLETION REQUEST ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('All req.body keys:', Object.keys(req.body));
    console.log('====================================');

    const status = req.body.status;
    const driver_comment = req.body.driver_comment;

    if (!status) {
      return res.status(400).send({
        success: false,
        message: "Status is required.",
      });
    }

    const t = await db.sequelize.transaction();

    try {
      const delivery = await Delivery.findByPk(id, { transaction: t });
      if (!delivery) {
        await t.rollback();
        return res.status(404).send({
          success: false,
          message: "Delivery not found.",
        });
      }

      const updateData = {
        status: parseInt(status, 10),
        report_stage: 1,
      };

      // ✅ Completed — record delivery time
      if (parseInt(status, 10) === 3) {
        updateData.delivered_at = new Date();
      }

      // ✅ Add driver comment if provided
      if (driver_comment !== undefined && driver_comment !== '') {
        updateData.driver_comment = driver_comment;
      }

      // ✅ Handle image upload to Cloudinary
      if (req.file) {
        console.log('Image received, uploading to Cloudinary...');
        
        try {
          // Convert buffer to base64 for Cloudinary
          const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(imageBase64, {
            folder: "deliveries",
            public_id: `delivery_${id}_${Date.now()}`,
            transformation: [
              { width: 1000, crop: "scale" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          });

          console.log('Image uploaded to Cloudinary:', result.secure_url);
          updateData.image = result.secure_url;
          
        } catch (uploadError) {
          console.error('Cloudinary upload failed:', uploadError);
          // Continue without image if upload fails
          updateData.image = null;
        }
      }

      // ✅ Update delivery record
      await delivery.update(updateData, { transaction: t });

      // ✅ If declined (status 5), restore stock
      if (parseInt(status, 10) === 5) {
        const items = await DeliveryItem.findAll({
          where: { delivery_id: id },
          transaction: t,
        });

        for (const item of items) {
          await Good.increment(
            { stock: item.quantity },
            { where: { id: item.good_id }, transaction: t }
          );
        }
      }

      await t.commit();

      res.send({
        success: true,
        message: "Delivery status updated successfully.",
        data: {
          id,
          status: parseInt(status, 10),
          image: updateData.image || null,
        },
      });
    } catch (err) {
      await t.rollback();
      console.error("Delivery completion failed:", err);
      res.status(500).send({
        success: false,
        message: "Server error: " + err.message,
      });
    }
  });
};

 exports.getDeliveryStatusSummary = async (req, res) => {
  const driverId = req.query.driver_id;
  if (!driverId) {
    return res.status(400).json({ success: false, message: 'driver_id is required' });
  }

  const { start, end } = ubTodayRange();

  try {
    // 1️⃣ get all statuses
    const statuses = await Status.findAll({
      attributes: ['id', 'status', 'color'],
      raw: true,
    });

    // 2️⃣ get deliveries where status = 3, filter by delivered_at today (UB)
    const deliveredCounts = await Delivery.findAll({
      where: {
        driver_id: driverId,
        status: 3,
        is_deleted: false,
        delivered_at: { [Op.between]: [start, end] },
      },
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // 3️⃣ get deliveries where status != 3, filter by updatedAt today
    const otherStatusCounts = await Delivery.findAll({
      where: {
        driver_id: driverId,
        status: { [Op.ne]: 3 },
        is_deleted: false,
        updatedAt: { [Op.between]: [start, end] },
      },
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // 4️⃣ merge counts from both queries into one map
    const countMap = {};

    deliveredCounts.forEach(d => {
      countMap[d.status] = parseInt(d.count, 10);
    });
    otherStatusCounts.forEach(d => {
      // If the status is already in countMap (delivered), add to it,
      // else set it freshly.
      countMap[d.status] = (countMap[d.status] ?? 0) + parseInt(d.count, 10);
    });

    // 5️⃣ combine with status list to ensure zero count statuses are included
    const result = statuses.map(s => ({
      id: s.id,
      status: s.status,
      color: s.color,
      count: countMap[s.id] ?? 0,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



  exports.getCounts = async (req, res) => {
    const driverId = req.query.merchant_id;
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'driver_id is required' });
    }
  
    const { start, end } = ubTodayRange();
  
    try {
      /* 1️⃣  all statuses */
      const statuses = await Status.findAll({
        attributes: ['id', 'status', 'color'],
        raw: true,
      });
  
      /* 2️⃣  deliveries grouped by status id, today only (UB) */
      const deliveries = await Delivery.findAll({
        where: {
          merchant_id: driverId,
          is_deleted: false,
          createdAt: { [Op.between]: [start, end] },
        },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      });
  
      /* 3️⃣  map counts */
      const countMap = {};
      deliveries.forEach(d => {
        countMap[d.status] = parseInt(d.count, 10);
      });
  
      /* 4️⃣  merge with status list (so zero‑count statuses still appear) */
      const result = statuses.map(s => ({
        id:     s.id,
        status: s.status,
        color:  s.color,
        count:  countMap[s.id] ?? 0,
      }));
  
      res.json({ success: true, data: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

exports.findWithStatusCustomer = (req, res) => {
  const merchantId = parseInt(req.params.id, 10);
  const status = parseInt(req.params.status, 10);

  if (isNaN(status) || isNaN(merchantId)) {
    return res.status(400).send({ success: false, message: "Invalid merchant or status parameter" });
  }

  const { start, end } = ubTodayRange();

  Delivery.findAll({
    where: {
      merchant_id: merchantId,
      status: status,
      is_deleted: false,
      createdAt: {
        [Op.between]: [start, end]
      }
    }
  })
  .then(data => {
    res.send({
      success: true,
      data: data
    });
  })
  .catch(err => {
    res.status(500).send({
      success: false,
      message: err.message || "Some error occurred while retrieving deliveries."
    });
  });
};