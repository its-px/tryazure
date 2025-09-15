export interface Service {
  id: string;
  name: string;
  description: string;
  duration: string;
  price?: string;
}

export const SERVICES: Service[] = [
  {
    id: "service1",
    name: "Service 1",
    description: "Description for service 1",
    duration: "60 minutes",
    price: "$50",
  },
  {
    id: "service2",
    name: "Service 2",
    description: "Description for service 2",
    duration: "90 minutes",
    price: "$75",
  },
];
