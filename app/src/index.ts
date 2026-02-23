import { serve } from "bun";
import index from "./client/index.html";
import { auth } from "./server/auth";
import { uploadsHandler } from "./server/api/routes/uploads";
import { getVideo, postVideo } from "./server/api/routes/videos";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/auth/*": async (req) => auth.handler(req),

    "/api/uploads": async (req) => uploadsHandler(req),

    "/api/videos": async (req) => postVideo(req),
    "/api/videos/:id": async (req) => getVideo(req),
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
