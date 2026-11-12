import * as yup from 'yup';

export const editProfileSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('El nombre es obligatorio.')
    .max(100, 'El nombre puede tener hasta 100 caracteres.'),
  lastName: yup
    .string()
    .trim()
    .required('El apellido es obligatorio.')
    .max(100, 'El apellido puede tener hasta 100 caracteres.'),
  biography: yup
    .string()
    .trim()
    .max(500, 'La biografía puede tener hasta 500 caracteres.'),
});
