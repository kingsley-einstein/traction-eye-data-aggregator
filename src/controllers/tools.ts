import { type Response, type Request, type NextFunction } from "express";
import LPAdapterBase from "../adapters/lp-base";
import stonFi from "../adapters/ston.fi";
import { HttpStatusCodes, LPSourceIdentifiers } from "../constants";
import { lpAdaptersReqParams, q } from "../shared/validators";
import assert from "assert";
import { isNil } from "lodash";

const lpAdapters = new Map<LPSourceIdentifiers, LPAdapterBase>();

lpAdapters.set(LPSourceIdentifiers.STON_FI, stonFi);

export const getAllLPForDEX = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedQuery = q.parse(req.query);
    const parsedParams = lpAdaptersReqParams.parse(req.params);

    assert.ok(!isNil(parsedParams.dex), "dex_path_param_required");

    const lpAdapter = lpAdapters.get(parsedParams.dex);
    const skip = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await lpAdapter.getAllLPRecords(skip, parsedQuery.limit);
    return res.status(HttpStatusCodes.OK).json({ result });
  } catch (error: any) {
    next(error);
  }
};