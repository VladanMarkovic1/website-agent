import generalDentistry from '../assets/images/general-dentistry.jpg';
import cosmeticDentistry from '../assets/images/cosmetic-dentistry.jpg';
import emergencyCare from '../assets/images/emergency-care.jpg';

const services = [
  {
    title: 'General Dentistry',
    description: 'Comprehensive dental care for the whole family, including cleanings, fillings, and preventive care.',
    image: generalDentistry,
    link: '#contact',
  },
  {
    title: 'Cosmetic Dentistry',
    description: 'Transform your smile with our aesthetic treatments including veneers, whitening, and orthodontics.',
    image: cosmeticDentistry,
    link: '#contact',
  },
  {
    title: 'Emergency Care',
    description: '24/7 emergency dental services when you need them most. Quick response for urgent dental problems.',
    image: emergencyCare,
    link: '#contact',
  },
];

const Services = () => {
  return (
    <section id="services" className="w-screen bg-gray-50 py-24">
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Our Services
          </h2>
          <p className="mt-4 text-xl text-gray-500">
            Comprehensive dental care tailored to your needs
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-16 lg:grid-cols-3 lg:gap-x-8">
          {services.map((service) => (
            <div key={service.title} className="flex flex-col">
              <div className="flex-1 relative pt-16 px-6 pb-8 bg-white rounded-2xl shadow-xl">
                <div className="absolute top-0 p-5 inline-block bg-primary rounded-xl shadow-lg transform -translate-y-1/2">
                  <img
                    className="h-24 w-24 object-cover rounded"
                    src={service.image}
                    alt={service.title}
                  />
                </div>
                <h3 className="text-xl font-medium text-gray-900">
                  {service.title}
                </h3>
                <p className="mt-4 text-base text-gray-500">
                  {service.description}
                </p>
                <div className="mt-6">
                  <a
                    href={service.link}
                    className="inline-flex px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services; 