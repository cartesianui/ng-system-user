import { BaseModel, enumMeta, EntityMeta } from '@cartesianui/platform-common';
import { Validators } from '@angular/forms';
import { Role, Permission } from '@cartesianui/system-auth';

// Canonical Gender enum for all user-derived entities (Patient, Doctor, Customer,
// Vendor, Employee, Artist, Agent, etc.). Overriding locally is supported — just
// re-declare a narrower `GenderMeta` in the consuming lib if different visuals are needed.
export const Genders = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
} as const;
export type Gender = (typeof Genders)[keyof typeof Genders];
export const GenderMeta = enumMeta(Genders, {
  labels: { male: 'Male',      female: 'Female',    other: 'Other'         },
  colors: { male: 'primary',   female: 'success',   other: 'secondary'     },
  icons:  { male: 'fa-solid fa-mars', female: 'fa-solid fa-venus', other: 'fa-solid fa-genderless' },
});

export interface IUser {
  id?: string | undefined;
  name: string | undefined;
  nickname?: string | undefined;
  birth?: string | undefined;
  email?: string | undefined;
  gender?: string | undefined;
  confirmed?: boolean | undefined;
  password?: string;
  logged?: boolean | undefined;
  roles?: Role[] | undefined
  permissions?: Permission[] | undefined
}

@EntityMeta({
  list: [
    { key: 'name', label: 'Name', opt: {
      link: true,
      formatter: {
        type: 'multiline',
        separator: 'br',
        items: [
          { key: 'image.variants.original.url', type: 'image', class: '32' },
          { key: 'name', displayAs: 'text' },
          { key: 'email', displayAs: 'muted' }
        ]
      }
    }},
    { key: 'roles', label: 'Roles', opt: {
      formatter: {
        type: 'func',
        func: (value: any) => {
          if (!value || !Array.isArray(value)) return '';
          return value.map((r: any) => `<span class="badge bg-info me-1">${r.displayName || r.name}</span>`).join('');
        }
      }
    }},
  ],
  form: [
    { key: 'name', label: 'Name', opt: { validators: [Validators.required, Validators.maxLength(255)] } },
    { key: 'email', label: 'Email', opt: { validators: [Validators.required, Validators.email] } },
    { key: 'gender', label: 'Gender', opt: {} },
    { key: 'birth', label: 'Birth Date', opt: { formatter: { type: 'date' } } },
    { key: 'password', label: 'Password', opt: { validators: [Validators.minLength(8)] } },
    { key: 'confirmPassword', label: 'Confirm Password', opt: {} },
  ],
  search: [
    'name:like',
    'email'
  ]
})
export class User extends BaseModel implements IUser {
  public id: string;
  public name: string;
  public nickname: string;
  public birth: string;
  public confirmed: boolean;
  public email: string;
  public gender: string;
  public logged: boolean;
  public roles: Role[] = [];
  public permissions: Permission[] = [];
  image?: any;

  constructor(data?: any) {
    super(data);
    if (data?.image?.data && !Array.isArray(data.image.data)) {
      this.image = data.image.data;
    }
    if (data?.roles?.data) {
      this.roles = data.roles.data;
    }
    if (data?.permissions?.data) {
      this.permissions = data.permissions.data;
    }
  }


}
