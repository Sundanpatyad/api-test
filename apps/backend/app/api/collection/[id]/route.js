import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Collection from '@/models/Collection';
import Request from '@/models/Request';
import { authenticate } from '@/lib/auth';

export async function GET(request, { params }) {
  const { error } = await authenticate(request);
  if (error) return error;

  try {
    await connectDB();
    const collection = await Collection.findById(params.id).populate('createdBy', 'name email');
    if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

    const requests = await Request.find({ collectionId: params.id }).sort({ order: 1, createdAt: 1 });
    return NextResponse.json({ collection, requests });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { error } = await authenticate(request);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const updated = await Collection.findByIdAndUpdate(params.id, body, { new: true });
    if (!updated) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    return NextResponse.json({ collection: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await authenticate(request);
  if (error) return error;

  try {
    await connectDB();
    await Collection.findByIdAndDelete(params.id);
    await Request.deleteMany({ collectionId: params.id });
    return NextResponse.json({ message: 'Collection and requests deleted' });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
