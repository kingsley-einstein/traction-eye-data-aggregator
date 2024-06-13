import { z } from "zod";
import { LPSourceIdentifiers } from "../../constants";
import { Address } from "@ton/core";

export const q = z
  .object({
    page: z.coerce.number().gt(0, "page must be greater than 0").default(1),
    limit: z.coerce.number().positive("limit must be a positive number").default(20),
  })
  .catchall(z.any());

export const lpAdaptersReqParams = z.object({
  dex: z.nativeEnum(LPSourceIdentifiers),
});

export const lpAdaptersReqParamsWithAddress = z.object({
  dex: z.nativeEnum(LPSourceIdentifiers),
  wallet: z.string().refine(arg => Address.isAddress(Address.parse(arg)), { message: "invalid ton address" }),
});
