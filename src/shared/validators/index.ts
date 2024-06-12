import { z } from "zod";
import { LPSourceIdentifiers } from "../../constants";

export const q = z
  .object({
    page: z.coerce.number().gt(0, "page must be greater than 0").default(1),
    limit: z.coerce.number().positive("limit must be a positive number").default(20),
  })
  .catchall(z.any());

export const lpAdaptersReqParams = z.object({
  dex: z.nativeEnum(LPSourceIdentifiers),
});
