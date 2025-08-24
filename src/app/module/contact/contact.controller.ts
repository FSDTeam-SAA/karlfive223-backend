import catchAsycn from "../../utils/catchAsycn";
import sendResponse from "../../utils/sendRespopnse";
import { contactService } from "./contact.service";

const createContact = catchAsycn(async (req, res) => {
  const result = await contactService.createContact(req.user?.email, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contact created successfully",
    data: result,
  });
});

const getAllContact = catchAsycn(async (req, res) => {
  const result = await contactService.getAllContact();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contact fetched successfully",
    data: result,
  });
});

const getSingleContact = catchAsycn(async (req, res) => {
  const result = await contactService.getSingleContact(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contact fetched successfully",
    data: result,
  });
});
const updateContact = catchAsycn(async (req, res) => {
  const result = await contactService.updateContact(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contact updated successfully",
    data: result,
  });
});
const deleteContact = catchAsycn(async (req, res) => {
  const result = await contactService.deleteContact(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Contact deleted successfully",
    data: result,
  });
});

export const contactController = {
  createContact,
  getAllContact,
  getSingleContact,
  updateContact,
  deleteContact,
};
