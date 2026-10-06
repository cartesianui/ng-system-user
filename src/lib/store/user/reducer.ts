import { entityFeature } from '@cartesianui/platform-common';
import { User } from '../../models';
import { UserActions } from './actions';

export const fromUser = entityFeature<User>('users', UserActions);
