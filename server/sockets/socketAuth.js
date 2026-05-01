import jwt from "jsonwebtoken";

export const socketAuth = (socket, next) => {
  try {
    // Try to get token from auth object (handshake) or from cookies
    let token = socket.handshake.auth?.token;

    if (!token && socket.request.headers.cookie) {
      const cookies = socket.request.headers.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('accessToken='));
      if (tokenCookie) {
        token = tokenCookie.split('=')[1].trim();
      }
    }

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return next(new Error("Invalid token payload"));
    }

    socket.userId = decoded.id.toString();
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
};