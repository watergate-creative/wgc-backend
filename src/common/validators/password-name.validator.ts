import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'passwordDoesNotContainName', async: false })
export class PasswordDoesNotContainNameConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string, args: ValidationArguments) {
    if (!password) return false;

    // We can get the entire object being validated from args.object
    const object = args.object as any;

    if (object.firstName) {
      const firstName = object.firstName.toLowerCase();
      if (password.toLowerCase().includes(firstName)) {
        return false;
      }
    }

    if (object.lastName) {
      const lastName = object.lastName.toLowerCase();
      if (password.toLowerCase().includes(lastName)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Password must not contain your first or last name for security reasons';
  }
}
