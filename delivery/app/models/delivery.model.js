module.exports = (sequelize, Sequelize) => {
  const Delivery = sequelize.define("delivery", {
    merchant_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 0
    },
    address: {
  type: Sequelize.TEXT, // or DataTypes.STRING(1000)
  allowNull: true
},
    status: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    driver_comment: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 0,
    },
    is_paid: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    is_rural: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },   
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    comment: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 0
    },
    driver_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    dist_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    is_reported: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_deleted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    report_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    delivery_id: {
      type: Sequelize.STRING(10),
      allowNull: false,
      unique: true
    },
image: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      },
    delivered_at: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    },
    // 🆕 New column
    goods: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    },
      number: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    },
  });

  return Delivery;
};
