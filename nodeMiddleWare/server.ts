import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import http from "http";
import fs from "fs";
import multer from "multer";
import path from "path";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const upload = multer({ dest: "uploads/" });

function hexDump(buffer: Buffer) {
  return buffer
    .toString("hex")
    .match(/.{1,2}/g)
    ?.join(" ");
}

// Function to forward the file
const forwardFile = (
  filePath: string,
  fileName: string,
  uniqueId: string,
  nodeId: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    const fileStream = fs.createReadStream(filePath);

    let body = "";
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += "Content-Type: application/octet-stream\r\n\r\n";

    const footer = `\r\n--${boundary}--\r\n`;

    let metadata = `--${boundary}\r\nContent-Disposition: form-data; name="unique_id"\r\n\r\n${uniqueId}\r\n`;
    metadata += `--${boundary}\r\nContent-Disposition: form-data; name="node_id"\r\n\r\n${nodeId}\r\n`;

    const options = {
      hostname: "127.0.0.1",
      port: 8000,
      path: "/upload",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve(data);
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    // Write the form body
    req.write(metadata);
    req.write(body);

    // Pipe the file stream
    fileStream.pipe(req, { end: false });

    // When the file stream ends, write the footer
    fileStream.on("end", () => {
      req.end(footer);
    });
  });
};

// Endpoint to receive and forward the uploaded file
app.post(
  "/forward-zip",
  upload.single("file"),
  async (req: Request, res: Response) => {
    console.log(req.body);
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const uniqueId = req.body.unique_id;
      if (!uniqueId) {
        return res.status(400).send("unique_id is required");
      }

      const filePath = path.join(__dirname, req.file.path);

      const NODE_ID = "node_id";

      try {
        const response = await forwardFile(
          filePath,
          req.file.originalname,
          uniqueId,
          NODE_ID
        );

        // Remove the temporary file
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting temporary file:", err);
          }
        });

        // Send a success response
        res.send({ message: "File forwarded successfully", response });
      } catch (error) {
        console.error("Error forwarding file:", error);
        res.status(500).send("Error forwarding file");
      }
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).send("Server error");
    }
  }
);

app.post(
  "/receive-zip",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const filePath = path.join(__dirname, req.file.path);
      const destinationDir = path.join(__dirname, "stored_files");
      const destinationPath = path.join(destinationDir, req.file.originalname);

      // Move the file to the desired location
      fs.rename(filePath, destinationPath, (err) => {
        if (err) {
          console.error("Error storing file:", err);
          return res.status(500).send("Error storing file");
        }

        // Send a success response
        res.send({
          message: "File uploaded and stored successfully",
          file: req.file?.originalname,
        });
      });
    } catch (error) {
      console.error("General error:", error);
      res.status(500).send("Server error");
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
