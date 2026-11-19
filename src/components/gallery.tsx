type Item={id:string;file_name:string;media_type:string;url:string};
export function Gallery({items}:{items:Item[]}) {
  if(!items.length)return <p className="my-10 rounded border border-dashed p-8 text-center text-gray-500">No approved photos or videos yet.</p>;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {items.map(m=><div key={m.id} className="overflow-hidden rounded-xl border bg-white">
      {m.media_type==="video"?<video className="aspect-square w-full bg-black object-contain" src={m.url} controls/>:<a href={m.url} target="_blank" rel="noreferrer"><img className="aspect-square w-full object-cover" src={m.url} alt={m.file_name}/></a>}
      <div className="flex justify-between gap-2 p-2 text-xs"><span className="truncate">{m.file_name}</span><a href={`/api/media/${m.id}/download`}>Download</a></div>
    </div>)}
  </div>
}