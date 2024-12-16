
// /////////////////////////
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import { JsonWebTokenError } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import multer from 'multer';

// const jwt = require('jsonwebtoken');



// Initialize Express app
const app = express();
app.use(express.json()); 
app.use(cookieParser()); 

// app.use(cors());

app.use(cors({
  origin: 'http://localhost:3000', // Specify the frontend origin
  credentials: true               // Allow credentials (cookies, headers, etc.)
}));

// MySQL connection configuration
// const db = mysql.createConnection({
//   host: 'autorack.proxy.rlwy.net',  // Public MySQL host
//   user: 'root',                     // MySQL username
//   password: 'fZOXLqIajMiMnvRTgoQPuPbooCUjdVtm', // MySQL password
//   database: 'railway',              // MySQL database name
//   port: 55861                       // MySQL port from the public URL
// });


const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'DataBasePassword',
  database: 'carRental',
  port: 3306
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});



// const multer = require('multer');
// const upload = multer({ storage: multer.memoryStorage() });
const upload = multer({ storage: multer.memoryStorage() });


// Helper function to validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to validate username and password length
const validateLength = (str, min, max) => {
  return str.length >= min && str.length <= max;
};


app.post('/api/register', (req, res) => {
  const { username, firstName, lastName, email, password, role } = req.body;

  // Validate user inputs
  if (!validateLength(username, 3, 50)) {
    return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (!validateLength(password, 8, 100)) {
    return res.status(400).json({ message: 'Password must be between 8 and 100 characters' });
  }
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }

  // Check if the user already exists
  const checkUserQuery = 'SELECT * FROM Users WHERE username = ? OR email = ?';
  db.query(checkUserQuery, [username, email], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Insert new user into the database
    const insertUserQuery = 'INSERT INTO Users (username, first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(insertUserQuery, [username, firstName, lastName, email, password, role], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      res.status(200).json({ message: 'User registered successfully' });
    });
  });
});




// User Login Endpoint
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body; // Use 'identifier' to accept either username or email

  // Validate input fields
  if (!validateLength(identifier, 3, 100)) { // Adjust the validation as appropriate for both email and username
    return res.status(400).json({ message: 'Identifier must be between 3 and 100 characters' });
  }
  if (!validateLength(password, 8, 100)) {
    return res.status(400).json({ message: 'Password must be between 8 and 100 characters' });
  }

  // Check if the user exists by username or email
  const userQuery = 'SELECT * FROM Users WHERE username = ? OR email = ?';
  db.query(userQuery, [identifier, identifier], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }

    const user = results[0];

    // Here you should ideally use a secure password comparison method if passwords are hashed
    if (password !== user.password) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    res.status(200).json({
      message: 'Login successful',
      username: user.username,
      userId: user.user_id, // Make sure the field name matches what's in your DB
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.last_name,



    });
  });
});

///////////////////////////


// Endpoint to add a new car to the database
app.post('/api/cars/add', upload.single('image'), (req, res) => {
  const {

    manufacturer, model, year, seats, doors, color, mileage, driveType, price, description, status
  } = req.body;
  const image = req.file ? req.file.buffer : null; // Accessing the image file buffer if uploaded

  // Basic validation
  if (!manufacturer || !model || !year || !seats || !doors || !price) {
    return res.status(400).json({ message: 'Please provide all mandatory fields (manufacturer, model, year, seats, doors, price).' });
  }
  if (!image) {
    return res.status(400).json({ message: 'Image file is required.' });
  }

  // SQL Query to insert a new car
  const insertCarQuery = 'INSERT INTO cars (manufacture, model, year, seats, doors, color, mileage, drive_type, price, description, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

  // Execute the query
  db.query(insertCarQuery, [manufacturer, model, year, seats, doors, color, mileage, driveType, price, description, image, status], (err, result) => {
    if (err) {
      console.error('Failed to add new car:', err);
      return res.status(500).json({ message: 'Database error while adding new car', error: err });
    }
    res.status(201).json({ message: 'New car added successfully', carId: result.insertId });
  });
});

// end point to retrieve all the list of cars
app.get('/api/cars/getallcars', (req, res) => {
  const query = 'SELECT * FROM cars';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Failed to retrieve cars:', err);
      return res.status(500).json({ message: 'Database error while retrieving cars', error: err });
    }
    res.json(results);
  });
});

app.get('/api/cars/search', (req, res) => {
  const { manufacture, model, year, price } = req.query;
  // let query = 'SELECT * FROM cars WHERE status = "available"';
  let query = 'SELECT * FROM cars  WHERE status = "available"';
  const params = [];

  if (manufacture) {
    query += ' AND manufacture LIKE ?';
    params.push(`%${manufacture}%`);
  }
  if (model) {
    query += ' AND model LIKE ?';
    params.push(`%${model}%`);
  }
  if (year) {
    query += ' AND year = ?';
    params.push(year);
  }
  if (price) {
    query += ' AND price <= ?';
    params.push(price);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Failed to retrieve cars:', err);
      return res.status(500).json({ message: 'Database error while retrieving cars', error: err });
    }
    res.json(results);
  });
});

// Endpoint to retrieve a car by ID
app.get('/api/cars/:carID', (req, res) => {
  const { carID } = req.params;

  // SQL query to fetch the car with the given ID
  const query = 'SELECT * FROM cars WHERE ID = ?';

  // Execute the query with the carID
  db.query(query, [carID], (err, results) => {
    if (err) {
      console.error('Failed to retrieve car:', err);
      return res.status(500).json({ message: 'Database error while retrieving car details', error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json(results[0]); // Send the first result since carID is unique
  });
});

// boking cars edpoint
app.post('/api/bookings', (req, res) => {
  console.log(req.body);
  const { carID, userId, tripStart, tripEnd, pickupReturnLocation, status } = req.body;

  if (!carID || !userId || !tripStart || !tripEnd || !pickupReturnLocation) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const query = `
      INSERT INTO Bookings (car_id, user_id, trip_start, trip_end, pickup_return_location, status) 
      VALUES (?, ?, ?, ?, ?, ?);
  `;

  const bookingStatus = status || 'on coming'; // Default to 'on coming' if status is not provided

  db.query(query, [carID, userId, tripStart, tripEnd, pickupReturnLocation, bookingStatus], (err, results) => {
    if (err) {
      console.error('Failed to create booking:', err);
      return res.status(500).json({ message: 'Database error while creating booking', error: err });
    }

    res.status(201).json({ message: 'Booking created successfully', bookingID: results.insertId });
  });
});



// cancel booking endpoint
app.patch('/api/bookings/:bookingID/cancel', (req, res) => {
  const { bookingID } = req.params;

  // Validate bookingID
  if (!bookingID) {
    return res.status(400).json({ message: 'Booking ID is required' });
  }

  // SQL query to update the status to "cancelled"
  const query = `
      UPDATE Bookings
      SET status = 'cancelled'
      WHERE booking_id = ? AND status != 'cancelled';
  `;

  db.query(query, [bookingID], (err, results) => {
    if (err) {
      console.error('Failed to cancel booking:', err);
      return res.status(500).json({ message: 'Database error while canceling booking', error: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found or already cancelled' });
    }

    res.status(200).json({ message: 'Booking cancelled successfully' });
  });
});

// Endpoint to retrieve all customer reviews
// Endpoint to retrieve customer reviews for a specific car
app.get('/api/customer-reviews/:carID', (req, res) => {
  const { carID } = req.params;

  // SQL query to fetch reviews for the specified carID
  // const query = `
  //   SELECT 
  //     review_id, 
  //     user_id, 
  //     car_id, 
  //     description, 
  //     score, 
  //     date_posted 
  //   FROM CustomerReviews
  //   WHERE car_id = ?
  // `;
  const query = `
  SELECT 
    cr.review_id, 
    cr.user_id, 
    cr.car_id, 
    cr.description, 
    cr.score, 
    cr.date_posted, 
    u.first_name
  FROM CustomerReviews cr
  JOIN Users u ON cr.user_id = u.user_id
  WHERE cr.car_id = ?
`;

  // Execute the query with the carID as a parameter
  db.query(query, [carID], (err, results) => {
    if (err) {
      console.error('Failed to retrieve customer reviews:', err);
      return res.status(500).json({
        message: 'Database error while retrieving customer reviews',
        error: err
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No reviews found for the specified car.' });
    }

    res.json(results); // Send the results as JSON
  });
});


app.get('/api/bookings/user/:userID', (req, res) => {
  const { userID } = req.params;

  if (!userID) {
    return res.status(400).json({ message: 'Need to login for this action' });
  }

  // SQL query to fetch bookings for the specified user
  const query = `
      SELECT 
          b.booking_id,
          b.car_id,
          c.manufacture,
          c.model,
          c.year,
          b.trip_start,
          b.trip_end,
          b.pickup_return_location,
          b.booking_date,
          b.status
      FROM 
          Bookings b
      JOIN 
          Cars c ON b.car_id = c.id
      WHERE 
          b.user_id = ?
  `;

  db.query(query, [userID], (err, results) => {
    if (err) {
      console.error('Failed to retrieve bookings:', err);
      return res.status(500).json({
        message: 'Database error while retrieving bookings',
        error: err
      });
    }

    // Check if no bookings are found
    if (!results.length) {
      return res.status(200).json({ message: 'No bookings found' });
    }

    res.status(200).json(results);
  });
});
// app.get('/api/bookings/user/:userID', (req, res) => {
//   const { userID } = req.params;

//   if (!userID) {
//       return res.status(400).json({ message: 'Need to loging for this action' });
//   }

//   // SQL query to fetch bookings for the specified user
//   const query = `
//       SELECT 
//           b.booking_id,
//           b.car_id,
//           c.manufacture,
//           c.model,
//           c.year,
//           b.trip_start,
//           b.trip_end,
//           b.pickup_return_location,
//           b.booking_date,
//           b.status
//       FROM 
//           Bookings b
//       JOIN 
//           Cars c ON b.car_id = c.id
//       WHERE 
//           b.user_id = ?
//   `;

//   db.query(query, [userID], (err, results) => {
//       if (err) {
//           console.error('Failed to retrieve bookings:', err);
//           return res.status(500).json({ message: 'Database error while retrieving bookings', error: err });
//       }

//       if (results.length === 0) {
//           return res.status(404).json({ message: 'No bookings found for the specified user' });
//       }

//       res.json(results);
//   });
// });


app.get('/api/users/:user_id', (req, res) => {
  const { user_id } = req.params; // Extract the user_id from the route parameters

  // SQL query to fetch user information for the specified user_id, excluding the role field
  const query = `
    SELECT 
      user_id, 
      username, 
      first_name, 
      last_name, 
      email 
    FROM Users
    WHERE user_id = ?
  `;

  // Execute the query with the provided user_id as a parameter
  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error('Failed to retrieve user:', err);
      return res.status(500).json({
        message: 'Database error while retrieving user',
        error: err
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(results[0]); // Send the user data as JSON
  });
});

app.put('/api/users/update', (req, res) => {
  const { user_id, first_name, last_name, email } = req.body;

  // Validate the user_id
  if (!user_id) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  // Dynamically construct the query and values based on the provided fields
  const updates = [];
  const values = [];

  if (first_name) {
    updates.push('first_name = ?');
    values.push(first_name);
  }
  if (last_name) {
    updates.push('last_name = ?');
    values.push(last_name);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }

  // Ensure at least one field is provided for update
  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }

  // Add user_id to the values array
  values.push(user_id);

  // Construct the final query
  const query = `
      UPDATE Users
      SET ${updates.join(', ')}
      WHERE user_id = ?
  `;

  // Execute the query
  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Failed to update user information:', err);
      return res.status(500).json({
        message: 'Database error while updating user information.',
        error: err,
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User information updated successfully.' });
  });
});

// Endpoint to change user password
app.put('/api/users/change-password', (req, res) => {
  const { user_id, password } = req.body;

  // Validate the input
  if (!user_id || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // SQL query to update the user's password
  const query = `
      UPDATE Users 
      SET password = ? 
      WHERE user_id = ?
  `;

  // Execute the query
  db.query(query, [password, user_id], (err, results) => {
    if (err) {
      console.error('Failed to update user password:', err);
      return res.status(500).json({
        message: 'Database error while updating password.',
        error: err,
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'Password changed successfully.' });
  });
});
// create a ticket
app.post('/api/tickets/create', (req, res) => {
  const { description, user_id } = req.body;

  // Validate the input
  if (!description || !user_id) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // SQL query to insert a new ticket with default status 'todo'
  const query = `
      INSERT INTO tickets (description, user_id, status) 
      VALUES (?, ?, 'todo')
  `;

  // Execute the query
  db.query(query, [description, user_id], (err, results) => {
    if (err) {
      console.error('Failed to create ticket:', err);
      return res.status(500).json({
        message: 'Database error while creating ticket.',
        error: err,
      });
    }

    res.status(201).json({
      message: 'Ticket created successfully.',
      ticket_id: results.insertId
    });
  });
});

// Cancel a booking (POST)
app.post('/api/bookings/cancel', (req, res) => {
  const { booking_id } = req.body;

  // Validate the input
  if (!booking_id) {
    return res.status(400).json({ message: 'Booking ID is required.' });
  }

  // SQL query to update the booking status to 'cancelled'
  const query = `
      UPDATE Bookings 
      SET status = 'cancelled' 
      WHERE booking_id = ?
  `;

  // Execute the query
  db.query(query, [booking_id], (err, results) => {
    if (err) {
      console.error('Failed to cancel booking:', err);
      return res.status(500).json({
        message: 'Database error while cancelling booking.',
        error: err,
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    res.status(200).json({ message: 'Booking cancelled successfully.' });
  });
});



app.put('/api/cars/update', (req, res) => {
  const { ID, manufacture, model, seats, doors, color, mileage, drive_type, price, description, status } = req.body;

  // Validate the ID
  if (!ID) {
    return res.status(400).json({ message: 'Car ID is required.' });
  }

  // Dynamically construct the query and values based on the provided fields
  const updates = [];
  const values = [];

  if (manufacture) {
    updates.push('manufacture = ?');
    values.push(manufacture);
  }
  if (model) {
    updates.push('model = ?');
    values.push(model);
  }
  if (seats) {
    updates.push('seats = ?');
    values.push(seats);
  }
  if (doors) {
    updates.push('doors = ?');
    values.push(doors);
  }
  if (color) {
    updates.push('color = ?');
    values.push(color);
  }
  if (mileage) {
    updates.push('mileage = ?');
    values.push(mileage);
  }
  if (drive_type) {
    updates.push('drive_type = ?');
    values.push(drive_type);
  }
  if (price) {
    updates.push('price = ?');
    values.push(price);
  }
  if (description) {
    updates.push('description = ?');
    values.push(description);
  }
  if (status) {
    updates.push('status = ?');
    values.push(status);
  }

  // Ensure at least one field is provided for update
  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }

  // Add ID to the values array
  values.push(ID);

  // Construct the final query
  const query = `
      UPDATE cars
      SET ${updates.join(', ')}
      WHERE ID = ?
  `;

  // Execute the query
  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Failed to update car information:', err);
      return res.status(500).json({
        message: 'Database error while updating car information.',
        error: err,
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Car not found.' });
    }

    res.json({ message: 'Car information updated successfully.' });
  });
});


app.post('/api/bookings/update-dates', (req, res) => {
  // console.log(req.body);
  const { booking_id, newStartDate, newEndDate } = req.body;

  // Validate input

  if (!booking_id || !newStartDate || !newEndDate) {
    return res.status(400).json({ message: 'Booking ID, start date, and end date are required' });
  }

  // SQL query to update the booking dates
  const query = `
      UPDATE Bookings 
      SET trip_start = ?, trip_end = ? 
      WHERE booking_id = ?;
  `;

  db.query(query, [newStartDate, newEndDate, booking_id], (err, results) => {
    if (err) {
      console.error('Failed to update booking dates:', err);
      return res.status(500).json({ message: 'Database error while updating booking dates', error: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({ message: 'Booking dates updated successfully' });
  });
});


// create new reviews
// Endpoint to create a new review
app.post('/api/reviews', (req, res) => {
  const { user_id, car_id, description, score } = req.body;

  // Validate input
  if (!user_id || !car_id || !description || typeof score !== 'number') {
    return res.status(400).json({ message: 'All fields (user_id, car_id, description, score) are required' });
  }

  // Ensure score is within acceptable range (e.g., 1-5)
  if (score < 1 || score > 5) {
    return res.status(400).json({ message: 'Score must be between 1 and 5' });
  }

  // SQL query to insert a new review
  const query = `
      INSERT INTO CustomerReviews (user_id, car_id, description, score) 
      VALUES (?, ?, ?, ?);
  `;

  db.query(query, [user_id, car_id, description, score], (err, results) => {
    if (err) {
      console.error('Failed to create review:', err);
      return res.status(500).json({ message: 'Database error while creating review', error: err });
    }

    res.status(201).json({
      message: 'Review created successfully',
      reviewID: results.insertId,
    });
  });
});






app.post('/api/car/setmaintenance/:carID', (req, res) => {
  const { carID } = req.params;

  // Validate carID
  if (!carID) {
    return res.status(400).json({ message: 'Car ID is required' });
  }

  // SQL query to update the status to "maintenance"
  const query = `
      UPDATE cars
      SET status = 'maintenance'
      WHERE ID = ?;
  `;

  db.query(query, [carID], (err, results) => {
    if (err) {
      console.error('Failed to update car status:', err);
      return res.status(500).json({ message: 'Database error while updating car details', error: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json({ message: 'Car status updated successfully' });
  });
});


app.post('/api/car/setavaliable/:carID', (req, res) => {
  const { carID } = req.params;

  // Validate carID
  if (!carID) {
    return res.status(400).json({ message: 'Car ID is required' });
  }

  // SQL query to update the status to "maintenance"
  const query = `
      UPDATE cars
      SET status = 'available'
      WHERE ID = ?;
  `;

  db.query(query, [carID], (err, results) => {
    if (err) {
      console.error('Failed to update car status:', err);
      return res.status(500).json({ message: 'Database error while updating car details', error: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Car not found' });
    }

    res.json({ message: 'Car status updated successfully' });
  });
});


// Get all tickets

// app.get('/api/getalltickets', (req, res) => {
//   const query = 'SELECT * FROM tickets';
//   db.query(query, (err, results) => {
//     if (err) {
//       console.error('Failed to retrieve cars:', err);
//       return res.status(500).json({ message: 'Database error while retrieving cars', error: err });
//     }
//     res.json(results);
//   });
// });


// // update ticket
// app.post('/api/ticketdone/:TicketID', (req, res) => {
//   const { TicketID } = req.params;

//   // SQL query to fetch the car with the given ID
//   // const query = 'SELECT * FROM cars WHERE ID = ?';

//   const query = `
//   UPDATE tickets
//   SET status = 'done'
//   WHERE ticket_id = ?;
// `;

//   // Execute the query with the carID
//   db.query(query, [carID], (err, results) => {
//     if (err) {
//       console.error('Failed to update ticket:', err);
//       return res.status(500).json({ message: 'Database error', error: err });
//     }

//     if (results.length === 0) {
//       return res.status(404).json({ message: 'Ticket not found' });
//     }

//     res.json(results[0]); // Send the first result since carID is unique
//   });
// });

// Get all tickets
app.get('/api/getalltickets', (req, res) => {
  const query = 'SELECT * FROM tickets';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Failed to retrieve tickets:', err);
      return res.status(500).json({ message: 'Database error while retrieving tickets', error: err });
    }
    res.json(results);
  });
});

// Update ticket status
app.post('/api/ticketdone/:ticketID', (req, res) => {
  const { ticketID } = req.params;

  const query = `
    UPDATE tickets
    SET status = 'done'
    WHERE ticket_id = ?;
  `;

  db.query(query, [ticketID], (err, results) => {
    if (err) {
      console.error('Failed to update ticket:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({ message: 'Ticket updated successfully' });
  });
});



// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

