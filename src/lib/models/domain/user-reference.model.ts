import { BaseModel } from '@cartesianui/platform-common';

export interface IUserReference {
  id?: string;
  name?: string;
  email?: string;
}

export class UserReference extends BaseModel implements IUserReference {
  id?: string;
  name?: string;
  email?: string;

  constructor(data?: IUserReference) {
    super(data);
  }
}
