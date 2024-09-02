import express from "express";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = 4001;

app.use(express.json());

app.get("/test", (req, res) => {
  return res.json("Server API is working 🚀");
});

app.get("/assignments", async (req, res) => {
  let results;
  const category = req.query.category;
  try {
    results = await connectionPool.query(
      `SELECT * FROM assignments
       WHERE ($1 IS NULL OR $1 = '' OR genres ILIKE $1)`,
      [category]
    );
  } catch (error) {
    return res.status(500).json({
      message: "Server could not read assignment because database connection",
      error: error.message,
    });
  }
  return res.status(200).json({
    data: results.rows,
  });
});

app.get("/assignments/:assignmentId", async (req, res) => {
  const assignmentIdFromClient = req.params.assignmentId;
  try {
    const results = await connectionPool.query(
      `SELECT * FROM assignments WHERE assignment_id=$1`,
      [assignmentIdFromClient]
    );
    if (!results.rows[0]) {
      return res
        .status(404)
        .json({ message: "Server could not find a requested assignment" });
    } else {
      return res.status(200).json({ data: results.rows[0] });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Server could not read assignment because database connection",
      error: error.message,
    });
  }
});

app.post("/assignments", async (req, res) => {
  const { title, content, category } = req.body;

  // Validate input data
  if (!title || !content || !category) {
    return res.status(400).json({
      message:
        "Missing required fields: title, content, and category are required.",
    });
  }

  const newAssignment = {
    title,
    content,
    category,
    created_at: new Date(),
    updated_at: new Date(),
    published_at: new Date(),
  };

  console.log(newAssignment);

  try {
    await connectionPool.query(
      `INSERT INTO assignments (title, content, category, created_at, updated_at, published_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        newAssignment.title,
        newAssignment.content,
        newAssignment.category,
        newAssignment.created_at,
        newAssignment.updated_at,
        newAssignment.published_at,
      ]
    );

    return res.status(201).json({
      message: "Created Assignment Successfully",
    });
  } catch (error) {
    console.error("Error executing query:", error);

    if (error.message.includes("database connection")) {
      return res.status(500).json({
        message:
          "Server could not create assignment because of a database connection error.",
        error: error.message,
      });
    } else if (error.message.includes("null value")) {
      return res.status(400).json({
        message: "Cannot insert null values into required fields.",
        error: error.message,
      });
    } else {
      return res.status(500).json({
        message: "An unexpected error occurred.",
        error: error.message,
      });
    }
  }
});

app.put("/assignments/:assignmentId", async (req, res) => {
  const assignmentIdFromClient = req.params.assignmentId;
  const updateAssignment = { ...req.body, updated_at: new Date() };

  try {
    // Ensure all required fields are present in the request body
    if (
      !updateAssignment.title ||
      !updateAssignment.content ||
      !updateAssignment.category
    ) {
      return res.status(400).json({
        message: "All fields (title, content, category) are required.",
      });
    }

    const result = await connectionPool.query(
      `UPDATE assignments
       SET title = $2,
           content = $3,
           category = $4,
           updated_at = $5
       WHERE assignment_id = $1`,
      [
        assignmentIdFromClient,
        updateAssignment.title,
        updateAssignment.content,
        updateAssignment.category,
        updateAssignment.updated_at,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Server could not find a requested assignment to update",
      });
    }

    return res.status(200).json({
      message: "Assignment updated successfully.",
    });
  } catch (error) {
    console.error("Error updating post:", error.message);
    return res.status(500).json({
      message: "Server could not update assignment because database connection",
      error: error.message,
    });
  }
});

app.delete("/assignments/:assignmentId", async (req, res) => {
  const assignmentIdFromClient = req.params.assignmentId;

  try {
    const result = await connectionPool.query(
      `DELETE FROM assignments WHERE assignment_id = $1`,
      [assignmentIdFromClient]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Server could not find a requested assignment to delete",
      });
    }

    return res.status(200).json({
      message: "Assignment deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting post:", error.message); // Log the error for debugging
    return res.status(500).json({
      message: {
        message:
          "Server could not delete assignment because database connection",
      },
      error: error.message, // Include error message in the response for better debugging
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
