import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("Seed skipped — data already exists.");
    return;
  }

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);

  const clinics = await Promise.all(
    [
      {
        name: "MedQueue Chilonzor",
        address: "Chilonzor tumani, Bunyodkor shoh ko'chasi 12",
        workingHours: "Dush-Shan 08:00 - 20:00",
      },
      {
        name: "MedQueue Yunusobod",
        address: "Yunusobod tumani, Amir Temur shoh ko'chasi 45",
        workingHours: "Dush-Shan 09:00 - 19:00",
      },
      {
        name: "MedQueue Mirzo Ulug'bek",
        address: "Mirzo Ulug'bek tumani, Universitet ko'chasi 3",
        workingHours: "Har kuni 08:00 - 21:00",
      },
    ].map((c) => prisma.clinic.create({ data: c }))
  );

  const doctorsData = [
    { name: "Dr. Aziza Karimova", specialty: "Terapevt", clinicIdx: 0 },
    { name: "Dr. Bobur Rashidov", specialty: "Kardiolog", clinicIdx: 0 },
    { name: "Dr. Dilnoza Yusupova", specialty: "Pediatr", clinicIdx: 1 },
    { name: "Dr. Sherzod Aliyev", specialty: "Nevrolog", clinicIdx: 1 },
    { name: "Dr. Malika Nazarova", specialty: "Dermatolog", clinicIdx: 2 },
    { name: "Dr. Jasur Tuychiyev", specialty: "Otolaringolog", clinicIdx: 2 },
  ];

  const doctors = await Promise.all(
    doctorsData.map((d, i) =>
      prisma.doctor.create({
        data: {
          name: d.name,
          specialty: d.specialty,
          photoUrl: `https://i.pravatar.cc/300?img=${i + 12}`,
          clinicId: clinics[d.clinicIdx].id,
        },
      })
    )
  );

  const patientNames = [
    "Aziz Sharipov",
    "Nodira Yoqubova",
    "Otabek Mirzayev",
    "Kamola Tashkentova",
    "Rustam Ismoilov",
    "Zarina Xolova",
    "Farrux Nurmatov",
    "Gulnora Saidova",
    "Javlon Ergashev",
    "Madina Rahimova",
  ];

  const patients = await Promise.all(
    patientNames.map((name, i) =>
      prisma.user.create({
        data: {
          name,
          phone: `+99890${String(1000000 + i).slice(-7)}`,
          email: `patient${i + 1}@medqueue.uz`,
          password: hashed,
        },
      })
    )
  );

  // demo account used by the frontend for auto-login
  const demoUser = await prisma.user.create({
    data: {
      name: "Aziz Ergashov",
      phone: "+998901234567",
      email: "demo@medqueue.uz",
      password: hashed,
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  // active queue for the demo user (this is what "Mening navbatim" shows)
  await prisma.appointment.create({
    data: {
      userId: demoUser.id,
      doctorId: doctors[0].id,
      clinicId: clinics[0].id,
      date: today,
      time: "14:30",
      status: "BOOKED",
      queue: {
        create: {
          queueNumber: 12,
          peopleAhead: 7,
          estimatedWaitMinutes: 24,
          status: "WAITING",
        },
      },
    },
  });

  // a handful of other active queues to make the system feel alive
  for (let i = 0; i < 5; i++) {
    const patient = patients[i];
    const doctor = doctors[(i + 1) % doctors.length];
    await prisma.appointment.create({
      data: {
        userId: patient.id,
        doctorId: doctor.id,
        clinicId: doctor.clinicId,
        date: today,
        time: `${10 + i}:00`,
        status: "BOOKED",
        queue: {
          create: {
            queueNumber: 3 + i,
            peopleAhead: 3 + i,
            estimatedWaitMinutes: (3 + i) * 3 + 3,
            status: "WAITING",
          },
        },
      },
    });
  }

  // lab tests for the demo user
  await prisma.labTest.createMany({
    data: [
      {
        userId: demoUser.id,
        name: "Umumiy qon tahlili",
        date: today,
        status: "READY",
        result: "Gemoglobin: 138 g/L",
        normalRange: "130-160 g/L",
      },
      {
        userId: demoUser.id,
        name: "Qon shakar darajasi",
        date: today,
        status: "READY",
        result: "5.2 mmol/L",
        normalRange: "3.9-5.5 mmol/L",
      },
      {
        userId: demoUser.id,
        name: "Umumiy siydik tahlili",
        date: today,
        status: "PENDING",
      },
    ],
  });

  // lab tests for other patients, so the system has more data overall
  for (let i = 0; i < 5; i++) {
    await prisma.labTest.create({
      data: {
        userId: patients[5 + i].id,
        name: ["Biokimyoviy tahlil", "Gormonlar paneli", "Lipid profil"][i % 3],
        date: today,
        status: i % 2 === 0 ? "READY" : "PENDING",
        result: i % 2 === 0 ? "Natija normal chegarada" : null,
        normalRange: i % 2 === 0 ? "Normada" : null,
      },
    });
  }

  // notifications for the demo user
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        message: "Navbatingiz muvaffaqiyatli olindi!",
        type: "BOOKING_CONFIRMED",
        read: true,
      },
      {
        userId: demoUser.id,
        message: "Tahlilingiz tayyor.",
        type: "LAB_READY",
        read: false,
      },
    ],
  });

  console.log("Seed complete:");
  console.log(`  clinics: ${clinics.length}`);
  console.log(`  doctors: ${doctors.length}`);
  console.log(`  patients: ${patients.length + 1} (incl. demo@medqueue.uz / ${DEMO_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
