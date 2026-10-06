import { BaseModel, EntityMeta } from '@cartesianui/platform-common';

interface IUserPermission {
  id?: string | undefined;
  userId: string;
  permissionIds: string[];
}

@EntityMeta({
  search: []
})
export class UserPermission extends BaseModel implements IUserPermission {
  id: string;
  userId: string;
  permissionIds: string[];

  constructor(data?: IUserPermission) {
    super(data);
  }

}
