// The same field definitions drive the center's form and server-side validation.
const fichaField=(key,label,type='text',max=140,choices=[])=>({key,label,type,max,choices});
const fichas={
  patient:[
    {title:'Identificación y contacto',fields:[
      fichaField('birthDate','Fecha de nacimiento','date',10),
      fichaField('sex','Sexo registrado','select',32,['Femenino','Masculino','Otro','Sin especificar']),
      fichaField('phone','Teléfono principal','tel',30),fichaField('altPhone','Teléfono alternativo','tel',30),
      fichaField('email','Correo electrónico','email',180),fichaField('language','Idioma de atención')
    ]},
    {title:'Domicilio y contacto de emergencia',fields:[
      fichaField('street','Calle y número'),fichaField('neighborhood','Colonia'),
      fichaField('city','Municipio o alcaldía'),fichaField('state','Entidad federativa'),
      fichaField('postalCode','Código postal','postal',5),fichaField('emergencyName','Nombre del contacto de emergencia'),
      fichaField('relationship','Parentesco o relación'),fichaField('emergencyPhone','Teléfono de emergencia','tel',30)
    ]},
    {title:'Atención y cobertura',fields:[
      fichaField('referrer','Institución que refiere'),fichaField('service','Servicio de procedencia'),
      fichaField('coverage','Aseguradora o institución de cobertura'),fichaField('policy','Folio de póliza o afiliación'),
      fichaField('authorization','Referencia de autorización'),fichaField('diagnosis','Diagnóstico registrado','textarea',500),
      fichaField('allergies','Alergias registradas','textarea',500),fichaField('observations','Observaciones del centro','textarea',700)
    ]}
  ],
  doctor:[
    {title:'Datos profesionales',fields:[
      fichaField('license','Cédula profesional','text',40),fichaField('specialtyLicense','Cédula de especialidad','text',40),
      fichaField('subspecialty','Subespecialidad'),fichaField('staffCode','Clave interna del médico','text',80),
      fichaField('institution','Hospital o institución'),fichaField('department','Servicio o departamento'),
      fichaField('office','Consultorio'),fichaField('position','Cargo o función')
    ]},
    {title:'Contacto y ubicación',fields:[
      fichaField('email','Correo profesional','email',180),fichaField('phone','Teléfono del consultorio','tel',30),
      fichaField('extension','Extensión','text',12),fichaField('mobile','Teléfono móvil','tel',30),
      fichaField('address','Dirección del consultorio','text',220),fichaField('city','Municipio o alcaldía'),
      fichaField('state','Entidad federativa'),fichaField('postalCode','Código postal','postal',5),
      fichaField('officeHours','Horario de contacto'),fichaField('observations','Observaciones del centro','textarea',700)
    ]}
  ]
};
