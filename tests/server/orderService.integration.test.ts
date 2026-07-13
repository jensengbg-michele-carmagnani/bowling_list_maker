import test from "node:test";
import assert from "node:assert/strict";
import { filterAndSortLists } from "../../shared/orderLists";
import { createOrderService } from "../../server/services/orderService.core";
import { createFakeSupabase } from "../helpers/fakeSupabase";

function buildService() {
  const fake = createFakeSupabase();
  const service = createOrderService({
    supabase: fake.supabase,
    getProductIcon: (productId) => `/product-icons/${productId}.svg`,
    assertNoError(error, context) {
      if (error) throw new Error(`${context}: ${error.message}`);
    },
    toHabitualFlag(value) {
      return value ? 1 : 0;
    }
  });

  return { ...fake, service };
}

test("createOrder salva azienda, nome auto-generato, metadati e prodotti normalizzati", async () => {
  const { db, service } = buildService();

  const created = await service.createOrder({
    companyName: "Acme Srl",
    items: [
      { productId: 1, quantity: 2 },
      { productId: 1, quantity: 1, notes: "urgente" },
      { productId: 2, quantity: 3 }
    ]
  });

  assert.ok(created);
  assert.equal(created.company_name, "Acme Srl");
  assert.equal(created.name, "Lista da inviare per Acme Srl");
  assert.equal(created.status, "draft");
  assert.equal(created.items.length, 2);
  assert.deepEqual(
    created.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      notes: item.notes
    })),
    [
      { product_id: 1, quantity: 3, notes: "urgente" },
      { product_id: 2, quantity: 3, notes: "" }
    ]
  );
  assert.equal(db.orders[0].company_name, "Acme Srl");
  assert.equal(db.order_items.length, 2);
  assert.equal(db.orders[0].last_accessed_at.length > 0, true);
});

test("updateOrder mantiene i nomi personalizzati e conserva l'associazione con l'azienda", async () => {
  const { db, service } = buildService();
  const created = await service.createOrder({
    companyName: "Panificio Alfa",
    name: "Lista pane urgente",
    items: [{ productId: 1, quantity: 1 }]
  });

  assert.ok(created);
  const beforeAccess = created.last_accessed_at;

  const updated = await service.updateOrder(created.id, {
    companyName: "Panificio Beta",
    status: "sent",
    items: [{ productId: 3, quantity: 5, notes: "consegna mattina" }]
  });

  assert.ok(updated);
  assert.equal(updated.name, "Lista pane urgente");
  assert.equal(updated.company_name, "Panificio Beta");
  assert.equal(updated.status, "sent");
  assert.equal(updated.items.length, 1);
  assert.equal(updated.items[0].product_id, 3);
  assert.equal(updated.items[0].notes, "consegna mattina");
  assert.notEqual(db.orders[0].last_accessed_at, beforeAccess);
});

test("createOrder rifiuta nomi duplicati e companyName mancante", async () => {
  const { service } = buildService();

  await service.createOrder({
    companyName: "Gamma Spa",
    items: [{ productId: 1, quantity: 1 }]
  });

  await assert.rejects(
    () =>
      service.createOrder({
        companyName: "gamma spa",
        items: [{ productId: 2, quantity: 1 }]
      }),
    /Esiste gia una lista con questo nome/
  );

  await assert.rejects(
    () =>
      service.createOrder({
        companyName: "   ",
        items: [{ productId: 1, quantity: 1 }]
      }),
    /Il nome dell'azienda e obbligatorio/
  );
});

test("duplicateOrder crea copie progressive preservando dati della lista originale", async () => {
  const { service } = buildService();
  const created = await service.createOrder({
    companyName: "Delta Srl",
    items: [{ productId: 2, quantity: 4 }]
  });

  assert.ok(created);

  const firstCopy = await service.duplicateOrder(created.id);
  const secondCopy = await service.duplicateOrder(created.id);

  assert.ok(firstCopy);
  assert.ok(secondCopy);
  assert.equal(firstCopy.name, "Lista da inviare per Delta Srl - copia");
  assert.equal(secondCopy.name, "Lista da inviare per Delta Srl - copia 2");
  assert.equal(firstCopy.company_name, "Delta Srl");
  assert.equal(secondCopy.items[0].quantity, 4);
});

test("listOrders e filterAndSortLists permettono ricerca e ordinamento per archivio liste", async () => {
  const { db, service } = buildService();

  const first = await service.createOrder({
    companyName: "Gamma",
    items: [{ productId: 1, quantity: 1 }]
  });
  const second = await service.createOrder({
    companyName: "Alfa",
    name: "Lista premium",
    items: [{ productId: 2, quantity: 2 }]
  });
  const third = await service.createOrder({
    companyName: "Beta",
    items: [{ productId: 3, quantity: 3 }]
  });

  assert.ok(first && second && third);

  db.orders.find((item) => item.id === first.id)!.created_at = "2026-01-01T08:00:00.000Z";
  db.orders.find((item) => item.id === second.id)!.created_at = "2026-01-02T08:00:00.000Z";
  db.orders.find((item) => item.id === third.id)!.created_at = "2026-01-03T08:00:00.000Z";

  const orders = await service.listOrders();

  assert.equal(orders.length, 3);
  assert.equal(orders[0].item_count, 1);

  assert.deepEqual(
    filterAndSortLists(orders, "alfa", "company-asc").map((item) => item.company_name),
    ["Alfa"]
  );

  assert.deepEqual(
    filterAndSortLists(orders, "lista", "created-desc").map((item) => item.id),
    [third.id, second.id, first.id]
  );

  assert.deepEqual(
    filterAndSortLists(orders, "", "name-asc").map((item) => item.name),
    ["Lista da inviare per Beta", "Lista da inviare per Gamma", "Lista premium"]
  );
});

test("deleteOrder elimina la lista e le sue righe persistite", async () => {
  const { db, service } = buildService();
  const created = await service.createOrder({
    companyName: "Omega",
    items: [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 2 }
    ]
  });

  assert.ok(created);
  assert.equal(db.order_items.length, 2);

  const deleted = await service.deleteOrder(created.id);
  const afterDelete = await service.getOrder(created.id);

  assert.equal(deleted, true);
  assert.equal(afterDelete, undefined);
  assert.equal(db.orders.length, 0);
  assert.equal(db.order_items.length, 0);
});
