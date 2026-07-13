import { getProductIcon } from "../productIcons";
import { assertNoError, supabase, toHabitualFlag } from "../supabase";
import { createOrderService } from "./orderService.core";

export type { StoredOrder } from "./orderService.core";

const orderService = createOrderService({
  supabase,
  getProductIcon,
  assertNoError,
  toHabitualFlag
});

export const {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  duplicateOrder,
  deleteOrder,
  previousOrderItems,
  productLastQuantities
} = orderService;
