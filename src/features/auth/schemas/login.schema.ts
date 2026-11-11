import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .required('El correo electrónico es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(254, 'El correo no puede superar los 254 caracteres'),

  password: yup
    .string()
    .required('La contraseña es obligatoria')
    .max(128, 'La contraseña no puede superar los 128 caracteres'),
});
