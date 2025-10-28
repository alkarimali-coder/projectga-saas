function Dashboard({ inventory }) {
  return (
    <div>
      <h2>Inventory</h2>
      <pre>{JSON.stringify(inventory, null, 2)}</pre>
    </div>
  );
}

export default Dashboard;
