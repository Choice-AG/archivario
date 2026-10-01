import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  recursiveDelete: vi.fn(),
  deleteLimit: vi.fn(),
  markDeletion: vi.fn(),
  disableSocial: vi.fn(),
}));
vi.mock("@/server/firebase", () => ({
  adminAuth: () => ({
    verifyIdToken: async (token: string) => {
      if (token === "valid")
        return { uid: "alice", auth_time: Date.now() / 1000 };
      if (token === "old") return { uid: "alice", auth_time: 0 };
      throw new Error("invalid");
    },
    deleteUser: mocks.deleteUser,
  }),
  db: () => ({
    recursiveDelete: mocks.recursiveDelete,
    collection: (name: string) => ({
      doc: (uid: string) => ({
        path: name + "/" + uid,
        delete: mocks.deleteLimit,
      }),
    }),
  }),
  // Deliberately no Storage adapter: deletion must work on Spark.
}));
// Lo público (perfil, actividad, seguidores) se borra antes que lo privado.
vi.mock("@/server/social", () => ({ disable: mocks.disableSocial }));
vi.mock("@/server/lifecycle", () => ({
  isDeleting: async () => false,
  deletionRef: () => ({ set: mocks.markDeletion }),
}));
import { DELETE } from "../src/app/api/account/route";
const request = (token = "valid", confirm = "ELIMINAR") =>
  new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirm }),
  });
beforeEach(() => vi.clearAllMocks());
it("elimina los datos propios y Auth sin necesitar Storage", async () => {
  expect((await DELETE(request())).status).toBe(200);
  expect(mocks.markDeletion).toHaveBeenCalledWith({ deleting: true });
  expect(mocks.recursiveDelete).toHaveBeenCalledWith(
    expect.objectContaining({ path: "users/alice" }),
  );
  expect(mocks.disableSocial).toHaveBeenCalledWith("alice");
  expect(mocks.deleteUser).toHaveBeenCalledWith("alice");
});
it("exige confirmación antes de borrar", async () => {
  expect((await DELETE(request("valid", "NO"))).status).toBe(400);
  expect(mocks.markDeletion).not.toHaveBeenCalled();
});
it("exige autenticación reciente antes de borrar", async () => {
  expect((await DELETE(request("old"))).status).toBe(401);
  expect(mocks.deleteUser).not.toHaveBeenCalled();
});
it("avisa de un borrado parcial si falla la eliminación en Auth", async () => {
  mocks.deleteUser.mockRejectedValueOnce(new Error("auth down"));
  const response = await DELETE(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error).toMatch(/Vuelve a intentarlo/);
});
