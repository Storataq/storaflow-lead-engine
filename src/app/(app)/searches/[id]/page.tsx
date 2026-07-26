import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SearchIdRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/zoekopdrachten/${id}`);
}
