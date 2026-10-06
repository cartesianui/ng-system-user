import { BaseModel, EntityMeta } from '@cartesianui/platform-common';

interface IUserRoles {
  id?: string | undefined;
  userId: string;
  roleIds: string[];
}

@EntityMeta({
  search: []
})
export class UserRole extends BaseModel implements IUserRoles {
  id: string;
  userId: string;
  roleIds: string[];

  constructor(data?: IUserRoles) {
    super(data);
  }

}
