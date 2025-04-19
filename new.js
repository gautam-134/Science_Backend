const OBSWebSocket = require("obs-websocket-js").default;
const obs = new OBSWebSocket();

const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

const obsConnectionDetails = {
  url: "ws://192.168.29.111:4455",
  password: "cRMtY5VvgslmWdTx",
};

let streamStatusMap = {};

obs
  .connect(obsConnectionDetails.url, obsConnectionDetails.password)
  .then(() => {
    console.log("Connected to OBS WebSocket!");
  })
  .catch((err) => {
    console.error("Error connecting to OBS:", err);
  });

// Example stream key (you can change this logic as needed)
let activeStreamKey = "wqxq-au4f-c2z7-ejkg-1cdy";

// Listen for OBS stream events
obs.on("StreamStarted", () => {
  console.log(`Stream has started for stream key: ${activeStreamKey}`);
  streamStatusMap[activeStreamKey] = {
    isStreaming: true,
    startTime: new Date(),
    stopTime: null,
  };
});

obs.on("StreamStopped", () => {
  console.log(`Stream has stopped for stream key: ${activeStreamKey}`);
  if (streamStatusMap[activeStreamKey]) {
    streamStatusMap[activeStreamKey].isStreaming = false;
    streamStatusMap[activeStreamKey].stopTime = new Date();
  }
});

app.post("/start-stream", async (req, res) => {
  const { streamKey, streamUrl } = req.body;

  if (!streamKey || !streamUrl) {
    return res
      .status(400)
      .json({ message: "Stream key and stream URL are required" });
  }

  try {
    // Set the active stream key and URL
    activeStreamKey = streamKey;
    console.log(`Active stream key set to: ${activeStreamKey}`);

    // Set the stream service settings for OBS (for WebSocket 5.x+)
    await obs.call("SetStreamServiceSettings", {
      streamServiceType: "rtmp_custom", // Custom RTMP type for the stream service
      streamServiceSettings: {
        server: streamUrl, // Example: rtmp://a.rtmp.youtube.com/live2
        key: streamKey, // Example: su3k-5xwx-uvk9-7ema-4kp0
      },
    });

    // Start the stream
    await obs.call("StartStream");

    return res
      .status(200)
      .json({ message: `Streaming started with key: ${streamKey}` });
  } catch (error) {
    console.error("Error starting stream:", error);
    return res
      .status(500)
      .json({ message: "Failed to start streaming", error: error.message });
  }
});

// API to stop the stream
app.post("/stop-stream", async (req, res) => {
  try {
    // Stop the stream
    await obs.call("StopStream");

    return res.status(200).json({ message: "Stream stopped successfully" });
  } catch (error) {
    console.error("Error stopping stream:", error);
    return res
      .status(500)
      .json({ message: "Failed to stop streaming", error: error.message });
  }
});

// API to get stream status based on the stream key
app.get("/stream-status/:streamKey", (req, res) => {
  const { streamKey } = req.params;

  const streamStatus = streamStatusMap[streamKey];

  if (!streamStatus) {
    return res
      .status(404)
      .json({ message: `No stream found for stream key: ${streamKey}` });
  }

  res.status(200).json({
    status: streamStatus.isStreaming ? "Live" : "Offline",
    startTime: streamStatus.startTime,
    stopTime: streamStatus.stopTime,
  });
});

// API to set the active stream key
app.post("/set-stream-key", (req, res) => {
  const { streamKey } = req.body;

  if (!streamKey) {
    return res.status(400).json({ message: "Stream key is required" });
  }

  activeStreamKey = streamKey;
  console.log(`Active stream key set to: ${activeStreamKey}`);

  res.status(200).json({ message: `Active stream key set to: ${streamKey}` });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
