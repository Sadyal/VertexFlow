export const successResponse = (res, data = {}, message = "Success", status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
};

export const errorResponse = (res, message = "Error", status = 500) => {
  return res.status(status).json({
    success: false,
    message,
  });
};