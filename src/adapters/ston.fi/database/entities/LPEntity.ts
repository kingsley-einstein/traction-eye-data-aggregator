import { BeforeInsert, Entity } from "typeorm";
import { SharedLPEntity } from "../../../../shared/database/entity";
import { LPSourceIdentifiers } from "../../../../constants";

@Entity()
export class LPEntity extends SharedLPEntity {
  @BeforeInsert()
  localPreInsert() {
    this.exchangeIdentifier = LPSourceIdentifiers.STON_FI;
  }
}
