import * as yup from 'yup';

export const registerSchema = yup.object({
  nickname: yup
    .string()
    .trim()
    .required('El nickname es obligatorio')
    .min(3, 'Debe tener al menos 3 caracteres')
    .max(50, 'No puede superar los 50 caracteres')
    .matches(
      /^[a-zA-Z0-9_]+$/,
      'Solo puede contener letras, números y guiones bajos',
    ),

  name: yup
    .string()
    .trim()
    .required('El nombre es obligatorio')
    .max(100, 'No puede superar los 100 caracteres'),

  lastName: yup
    .string()
    .trim()
    .required('El apellido es obligatorio')
    .max(100, 'No puede superar los 100 caracteres'),

  email: yup
    .string()
    .trim()
    .required('El correo es obligatorio')
    .email('Ingresa un correo electrónico válido')
    .max(254, 'No puede superar los 254 caracteres'),

  password: yup
    .string()
    .required('La contraseña es obligatoria')
    .min(8, 'Debe tener al menos 8 caracteres')
    .max(128, 'No puede superar los 128 caracteres'),

  birthdate: yup
    .string()
    .test('valid-date', 'Ingresa una fecha válida', (value) => {
      if (!value) return true;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }),
});
