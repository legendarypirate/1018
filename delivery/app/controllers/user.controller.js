const db = require("../models");
const User = db.users;
const Op = db.Sequelize.Op;
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Number of salt rounds for bcrypt
const DRIVER_ROLE_ID = 3;

const findDuplicateDriver = async (username, excludeId = null) => {
  const where = {
    role_id: DRIVER_ROLE_ID,
    username: { [Op.iLike]: username.trim() },
  };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }
  return User.findOne({ where });
};

// Create and Save a new User
exports.create = async (req, res) => {
  // Validate request
  if (!req.body.username || !req.body.role_id || !req.body.password) {
    res.status(400).send({
      success: false,
      message: "Content can not be empty!"
    });
    return;
  }

  try {
    if (Number(req.body.role_id) === DRIVER_ROLE_ID) {
      const existingDriver = await findDuplicateDriver(req.body.username);
      if (existingDriver) {
        return res.status(400).send({
          success: false,
          message: "Driver with this name already exists."
        });
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Create a User object
    const user = {
      username: req.body.username.trim(),
      phone: req.body.phone,
      email: req.body.email,
      role_id: req.body.role_id,
      password: hashedPassword,
      is_active: true,
    };

    // Save User in the database
    const data = await User.create(user);
    res.send({ success: true, data });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message || "Some error occurred while creating the User."
    });
  }
};

exports.findMerchants = (req, res) => {
  User.findAll({ where: { role_id: 2 } }) // Adjust the role_id if needed
    .then(data => {
      res.send({ success: true, data });
    })
    .catch(err => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving merchants."
      });
    });
};

exports.findDrivers = async (req, res) => {
  try {
    const drivers = await User.findAll({
      where: { role_id: DRIVER_ROLE_ID },
      attributes: ['id', 'username', 'is_active'],
      order: [['is_active', 'DESC'], ['username', 'ASC']],
    });

    res.send({
      success: true,
      data: drivers
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message || "Some error occurred while retrieving drivers."
    });
  }
};
exports.findAll = async (req, res) => {
  const username = req.query.username;

  // Build dynamic condition object
  const condition = {
    role_id: { [Op.ne]: 1 } // Exclude users with role_id === 1
  };

  if (username) {
    condition.username = { [Op.like]: `%${username}%` };
  }

  try {
    const data = await User.findAll({
      where: condition,
      order: [
        ['is_active', 'DESC'],
        ['role_id', 'DESC'],
        ['username', 'ASC'],
      ],
    });

    res.send({
      success: true,
      data: data
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message || "Some error occurred while retrieving users."
    });
  }
};

// Find a single User with an id
exports.findOne = (req, res) => {
  const id = req.params.id;

  User.findByPk(id)
    .then(data => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({
          message: `Cannot find User with id=${id}.`
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Error retrieving User with id=" + id
      });
    });
};

// Update a User by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: `Cannot find User with id=${id}.`
      });
    }

    const roleId = req.body.role_id != null ? Number(req.body.role_id) : user.role_id;
    const username = req.body.username != null ? req.body.username.trim() : user.username;

    if (roleId === DRIVER_ROLE_ID && username) {
      const existingDriver = await findDuplicateDriver(username, id);
      if (existingDriver) {
        return res.status(400).send({
          success: false,
          message: "Driver with this name already exists."
        });
      }
    }

    const updateData = { ...req.body };
    if (updateData.username) {
      updateData.username = updateData.username.trim();
    }
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    const [num] = await User.update(updateData, { where: { id } });

    if (num === 1) {
      res.send({
        success: true,
        message: "User was updated successfully."
      });
    } else {
      res.send({
        success: false,
        message: `Cannot update User with id=${id}. Maybe req.body is empty!`
      });
    }
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Error updating User with id=" + id
    });
  }
};

// Delete a User with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  User.destroy({ where: { id: id } })
    .then(num => {
      if (num === 1) {
        res.json({
          success: true,
          message: "User was deleted successfully!"
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Cannot delete User with id=${id}. Maybe User was not found!`
        });
      }
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        message: "Could not delete User with id=" + id
      });
    });
};


// Delete all User from the database.
exports.deleteAll = (req, res) => {
  User.destroy({
    where: {},
    truncate: false
  })
    .then(nums => {
      res.send({ message: `${nums} User were deleted successfully!` });
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while removing all User."
      });
    });
};

// find all published User
exports.findAllPublished = (req, res) => {
  User.findAll({ where: { published: true } })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      res.status(500).send({
        message:
          err.message || "Some error occurred while retrieving User."
      });
    });
};
