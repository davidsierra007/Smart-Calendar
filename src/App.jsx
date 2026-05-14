import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Anchor, Plus, X, CalendarDays, List, Loader2, Phone, Fingerprint, Clock, Ship, Trash2, Edit3, Users, DollarSign, User, RefreshCw } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';

const obtenerTarifaDinamica = (servicioInfo, cantidadPasajeros) => {
  if (!servicioInfo || !servicioInfo.fields) return 0;

  const tarifaBase = Number(servicioInfo.fields["Costo / Hora"]) || 0;
  const obsRaw = servicioInfo.fields["Observaciones"];
  const pax = Number(cantidadPasajeros) || 1;

  if (obsRaw) {
    try {
      let cleanJson = String(obsRaw).replace(/“/g, '"').replace(/”/g, '"').replace(/'/g, '"');
      
      // Si el usuario simplemente escribió un número (ej. "500000") en Observaciones
      if (!isNaN(Number(cleanJson.trim()))) {
        return Number(cleanJson.trim());
      }

      if (!cleanJson.trim().startsWith('[')) cleanJson = `[${cleanJson}]`;
      const reglas = JSON.parse(cleanJson);

      if (Array.isArray(reglas) && reglas.length > 0) {
        const reglasOrdenadas = [...reglas].sort((a, b) => a.max_pax - b.max_pax);
        for (let regla of reglasOrdenadas) {
          if (pax <= regla.max_pax) return Number(regla.precio || regla.precio_base || 0);
        }
        return Number(reglasOrdenadas[reglasOrdenadas.length - 1].precio);
      }
    } catch (e) {
      console.warn(`Error leyendo JSON del servicio ${servicioInfo.fields["Servicios"]}:`, e);
    }
  }
  return tarifaBase;
};

export default function App() {
  const [vista, setVista] = useState('calendario');
  const [servicios, setServicios] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [reservasRaw, setReservasRaw] = useState([]);
  const [directorioClientes, setDirectorioClientes] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '', cedula: '', celular: '', email: '', servicioId: '',
    fecha: new Date().toISOString().split('T')[0], horaInicio: '09:00', horaFin: '10:00', pasajeros: '1'
  });

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const token = import.meta.env.VITE_AIRTABLE_TOKEN;
      const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
      const h = { Authorization: `Bearer ${token}` };

      const fetchAllAirtable = async (url) => {
        let allRecords = [];
        let offset = null;
        do {
          const fetchUrl = offset ? `${url}${url.includes('?') ? '&' : '?'}offset=${offset}` : url;
          const res = await fetch(fetchUrl, { headers: h });
          const data = await res.json();
          if (data.records) allRecords = allRecords.concat(data.records);
          offset = data.offset;
        } while (offset);
        return { records: allRecords };
      };

      const [dataS, dataC, dataMaster, dataRecepcion, dataBot] = await Promise.all([
        fetchAllAirtable(`https://api.airtable.com/v0/${baseId}/tblO0IKU0Js0OSYS4`),
        fetchAllAirtable(`https://api.airtable.com/v0/${baseId}/tblWyA0qBWf1rid3I`),
        fetchAllAirtable(`https://api.airtable.com/v0/${baseId}/tbl03PFfsljo2LjbP`),
        fetchAllAirtable(`https://api.airtable.com/v0/${baseId}/tblDsPf9K5gk8OBXs`),
        fetchAllAirtable(`https://api.airtable.com/v0/${baseId}/tbl51L7vIVeOC50F6`)
      ]);

      setServicios(dataS.records || []);

      const mapaContactos = {};
      dataC.records?.forEach(r => {
        if (r.fields["Cedula"]) {
          mapaContactos[r.fields["Cedula"]] = {
            celular: r.fields["Celular"] || "N/A",
            email: r.fields["Email"] || "N/A"
          };
        }
      });
      setDirectorioClientes(mapaContactos);

      const agrupado = {};
      const todasLasReservas = [];
      [
        ...(dataMaster.records || []),
        ...(dataRecepcion.records || []),
        ...(dataBot.records || [])
      ].forEach(r => {
        const f = r.fields;
        const inicio = f["Fecha / Hora Inicio - Fin"] || f["Hora Inicio"] || f["Fecha"];
        if (!inicio) return;
        const key = `${f["Cedula"]}-${inicio}-${f["Servicio"]}`;
        if (!agrupado[key]) {
          agrupado[key] = { ...r, allIds: [r.id] };
          todasLasReservas.push(agrupado[key]);
        } else {
          agrupado[key].allIds.push(r.id);
        }
      });

      setReservasRaw(todasLasReservas);

      const resT = todasLasReservas.map(r => {
        const inicioDate = r.fields["Fecha / Hora Inicio - Fin"] || r.fields["Hora Inicio"] || r.fields["Fecha"];
        let duracionSec = r.fields["Duracion Servicio"] || 0;

        let finDate = r.fields["Hora Fin"];
        if (!finDate && duracionSec > 0) {
          const dInicio = new Date(inicioDate);
          if (!isNaN(dInicio.getTime())) {
            finDate = new Date(dInicio.getTime() + (Number(duracionSec) * 1000)).toISOString();
          }
        }
        
        // Si no hay duracionSec pero tenemos inicio y fin, la calculamos
        if (duracionSec === 0 && inicioDate && finDate) {
          const dInicio = new Date(inicioDate);
          const dFin = new Date(finDate);
          if (!isNaN(dInicio.getTime()) && !isNaN(dFin.getTime())) {
            duracionSec = (dFin.getTime() - dInicio.getTime()) / 1000;
          }
        }

        const sRaw = r.fields["Servicio"];
        const sClean = Array.isArray(sRaw) ? sRaw[0] : (sRaw || 'No especificado');
        const sData = (dataS.records || []).find(serv => serv.id === sClean || serv.fields["Servicios"] === sClean);

        const pasajerosGuardados = r.fields["Pasajeros"] || 1;
        // Ahora también leemos el valor total desde la base de datos si ya existe, si no, lo calculamos visualmente
        const valorTotalGuardado = r.fields["Valor Total"];

        const tarifaHora = obtenerTarifaDinamica(sData, pasajerosGuardados);
        const horasCalculadas = duracionSec > 0 ? (duracionSec / 3600) : 0;
        const valorTotalCalculado = horasCalculadas * tarifaHora;

        return {
          id: r.id,
          title: `⛵ ${r.fields["Nombre Completo"] || r.fields["Nombre de Cliente"] || 'Reserva'}`,
          start: inicioDate,
          end: finDate,
          backgroundColor: '#2563eb',
          extendedProps: {
            allIds: r.allIds,
            id: r.id,
            cliente: r.fields["Nombre Completo"] || r.fields["Nombre de Cliente"] || 'Sin nombre',
            servicio: sData ? sData.fields["Servicios"] : sClean,
            servicioIdRaw: sClean,
            cedula: r.fields["Cedula"] || 'N/A',
            celular: r.fields["Telefono"] || r.fields["Celular"] || mapaContactos[r.fields["Cedula"]]?.celular || "N/A",
            pasajeros: pasajerosGuardados,
            valorTotal: valorTotalGuardado != null ? valorTotalGuardado : valorTotalCalculado,
            pago: r.fields["Estado de Reserva"] || r.fields["Estado de Pago"] || 'Pendiente',
            inicio: inicioDate,
            fin: finDate,
            fecha: inicioDate ? inicioDate.split('T')[0] : ''
          }
        };
      });
      setEventos(resT);
    } catch (e) { console.error("fetchData error:", e); } finally { setIsSyncing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
    setIsDetailsOpen(true);
  };

  const handleEliminar = async (eventoId) => {
    if (!window.confirm("¿Deseas cancelar y eliminar esta reserva permanentemente?")) return;
    setIsLoading(true);
    try {
      const token = import.meta.env.VITE_AIRTABLE_TOKEN;
      const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
      const h = { Authorization: `Bearer ${token}` };

      const reservaOriginal = eventos.find(e => e.id === eventoId);
      const idsToDelete = reservaOriginal?.extendedProps?.allIds || [eventoId];

      const tablas = ['tblDsPf9K5gk8OBXs', 'tbl03PFfsljo2LjbP', 'tbl51L7vIVeOC50F6'];
      const deletePromises = [];
      
      idsToDelete.forEach(id => {
        tablas.forEach(t => {
          deletePromises.push(
            fetch(`https://api.airtable.com/v0/${baseId}/${t}/${id}`, { method: 'DELETE', headers: h })
          );
        });
      });
      
      await Promise.all(deletePromises);

      setIsDetailsOpen(false);
      await fetchData();
      alert("Reserva cancelada correctamente.");
    } catch (e) { alert("Error al eliminar."); }
    finally { setIsLoading(false); }
  };

  const prepararEdicion = (reservaInfo) => {
    const sId = servicios.find(s => s.fields["Servicios"] === reservaInfo.servicio || s.id === reservaInfo.servicioIdRaw)?.id || '';
    const extraerHora = (iso) => (iso && iso.includes('T')) ? iso.split('T')[1].substring(0, 5) : "09:00";

    setFormData({
      nombre: reservaInfo.cliente, cedula: reservaInfo.cedula, celular: reservaInfo.celular, email: reservaInfo.email,
      servicioId: sId, fecha: reservaInfo.fecha, horaInicio: extraerHora(reservaInfo.inicio),
      horaFin: extraerHora(reservaInfo.fin), pasajeros: String(reservaInfo.pasajeros || '1')
    });

    setEditingId(reservaInfo.allIds || [reservaInfo.id]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const token = import.meta.env.VITE_AIRTABLE_TOKEN;
      const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
      const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const inicioNuevo = new Date(`${formData.fecha}T${formData.horaInicio}:00`);
      const finNuevo = new Date(`${formData.fecha}T${formData.horaFin}:00`);
      const durSec = Math.floor((finNuevo.getTime() - inicioNuevo.getTime()) / 1000);

      const nomServObj = servicios.find(s => s.id === formData.servicioId);
      const nomServ = nomServObj?.fields["Servicios"] || "";

      // 🧮 CÁLCULO DEL VALOR TOTAL PARA GUARDAR EN LA BASE DE DATOS
      const tarifaAplicada = obtenerTarifaDinamica(nomServObj, formData.pasajeros);
      const horasCalculadas = durSec > 0 ? (durSec / 3600) : 0;
      const valorTotalParaGuardar = Math.round(horasCalculadas * tarifaAplicada);

      const choque = reservasRaw.find(r => {
        if (editingId && r.id === editingId) return false;
        const sRaw = r.fields["Servicio"];
        const sClean = Array.isArray(sRaw) ? sRaw[0] : (sRaw || '');
        if (sClean !== nomServ && sClean !== formData.servicioId) return false;

        const iniR = r.fields["Fecha / Hora Inicio - Fin"] || r.fields["Hora Inicio"] || r.fields["Fecha"];
        let fR = r.fields["Hora Fin"];
        const durR = r.fields["Duracion Servicio"];
        if (!fR && durR != null) {
          const dIni = new Date(iniR);
          if (!isNaN(dIni.getTime())) fR = new Date(dIni.getTime() + (Number(durR) * 1000)).toISOString();
        }

        if (!iniR || !fR) return false;
        return (inicioNuevo < new Date(fR) && finNuevo > new Date(iniR));
      });

      if (choque) {
        setIsLoading(false);
        alert(`⚠️ OCUPADO por ${choque.fields["Nombre Completo"] || choque.fields["Nombre de Cliente"]}. No hay disponibilidad en este horario.`);
        return;
      }

      // EMPAQUETADO DE DATOS (AHORA INCLUYE VALOR TOTAL)
      const fieldsUnified = {
        "Nombre Completo": formData.nombre,
        "Cedula": formData.cedula,
        "Telefono": formData.celular,
        "Servicio": [formData.servicioId],
        "Fecha / Hora Inicio - Fin": inicioNuevo.toISOString(),
        "Duracion Servicio": durSec,
        "Estado de Reserva": "Pendiente",
        "Pasajeros": String(formData.pasajeros),
        "Valor Total": String(valorTotalParaGuardar) // <--- AQUÍ SE ENVÍA A AIRTABLE
      };

      if (!editingId) {
        const reqCliente = await fetch(`https://api.airtable.com/v0/${baseId}/tblWyA0qBWf1rid3I`, {
          method: 'POST', headers: h,
          body: JSON.stringify({ records: [{ fields: { "Nombre": formData.nombre, "Cedula": formData.cedula, "Celular": formData.celular, "Servicio": nomServ } }], typecast: true })
        });
        if (!reqCliente.ok) {
          const errData = await reqCliente.json();
          throw new Error(`Error en base de clientes: ${errData.error?.message}`);
        }
      }

      const tablasDestino = ['tblDsPf9K5gk8OBXs', 'tbl03PFfsljo2LjbP'];
      await Promise.all(tablasDestino.map(async (table) => {
        const url = `https://api.airtable.com/v0/${baseId}/${table}${editingId ? `/${editingId}` : ''}`;
        const reqSync = await fetch(url, {
          method: editingId ? 'PATCH' : 'POST',
          headers: h,
          body: JSON.stringify(editingId ? { fields: fieldsUnified, typecast: true } : { records: [{ fields: fieldsUnified }], typecast: true })
        });

        if (!reqSync.ok) {
          const errData = await reqSync.json();
          throw new Error(`Error Airtable: Faltan columnas en la tabla o los datos no coinciden. Mensaje original: ${errData.error?.message || 'Error desconocido'}`);
        }
        return reqSync;
      }));

      setIsModalOpen(false);
      setEditingId(null);
      await fetchData();
      alert(`✅ ¡Reserva exitosa!\n\nHorario agendado: ${formatearHora(inicioNuevo.toISOString())} - ${formatearHora(finNuevo.toISOString())}`);

    } catch (e) { alert(`❌ RECHAZADO: ${e.message}`); } finally { setIsLoading(false); }
  };

  const formatearHora = (iso) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calcularPreviewTotal = () => {
    const s = servicios.find(srv => srv.id === formData.servicioId);
    if (!s) return { tarifa: 0, total: 0 };

    const tarifaAplicada = obtenerTarifaDinamica(s, formData.pasajeros);
    const ini = new Date(`1970-01-01T${formData.horaInicio}:00`);
    const fin = new Date(`1970-01-01T${formData.horaFin}:00`);
    const horas = (fin - ini) / 3600000;

    return {
      tarifa: tarifaAplicada,
      total: horas > 0 ? (horas * tarifaAplicada) : 0
    };
  };

  const preview = calcularPreviewTotal();

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-slate-900">
      <aside className="w-80 bg-[#0F172A] text-slate-300 flex flex-col z-20 shadow-2xl">
        <div className="p-8 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Anchor size={24} /></div>
          <span className="text-xl font-black text-white uppercase italic tracking-wider">Smart Calendar</span>
        </div>
        <div className="px-4 mb-8 space-y-2">
          <button onClick={() => setVista('calendario')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl ${vista === 'calendario' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800/50'}`}><CalendarDays size={18} /> <b>Calendario</b></button>
          <button onClick={() => setVista('tabla')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl ${vista === 'tabla' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800/50'}`}><List size={18} /> <b>Lista Reservas</b></button>
        </div>
        <div className="flex-1 px-4 overflow-y-auto space-y-3 pb-8">
          {servicios.map(s => (
            <button key={s.id} onClick={() => { setEditingId(null); setFormData({ ...formData, servicioId: s.id }); setIsModalOpen(true); }} className="w-full text-left bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50 hover:border-blue-500 transition-all text-[10px] font-bold text-white uppercase">
              {s.fields["Servicios"]}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-white overflow-hidden">
        <header className="h-24 border-b flex items-center justify-between px-10">
          <p className="text-2xl font-black text-slate-800 uppercase italic">Agendamiento <span className="text-blue-600">El Brujo</span></p>
          <div className="flex gap-4">
            <button onClick={fetchData} disabled={isSyncing} className="bg-slate-100 text-slate-700 px-5 py-3.5 rounded-2xl font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2 hover:bg-slate-200">
              <RefreshCw size={18} className={isSyncing ? "animate-spin text-blue-600" : ""} /> Sincronizar
            </button>
            <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">+ Programar</button>
            <div className="flex items-center ml-2 border-l border-slate-200 pl-6">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 bg-[#F8FAFC] overflow-hidden">
          {vista === 'calendario' ? (
            <div className="h-full bg-white rounded-[2.5rem] shadow-2xl p-6 border"><FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={eventos} locale={esLocale} height="100%" eventClick={handleEventClick} /></div>
          ) : (
            <div className="h-full bg-white rounded-[3rem] shadow-2xl p-8 overflow-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white"><tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><th className="p-5 border-b">Cliente</th><th className="p-5 border-b">Servicio</th><th className="p-5 text-center border-b">Horario</th></tr></thead>
                <tbody>{eventos.map(e => (
                  <tr key={e.id} className="hover:bg-blue-50/10 border-b transition-colors"><td className="p-5"><b>{e.extendedProps.cliente}</b><div className="text-[10px] text-slate-400">CC: {e.extendedProps.cedula}</div></td><td className="p-5"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase">{e.extendedProps.servicio}</span></td><td className="p-5 text-sm text-center font-bold text-blue-600">{formatearHora(e.extendedProps.inicio)} - {formatearHora(e.extendedProps.fin)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isDetailsOpen && selectedEvent && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border">
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setIsDetailsOpen(false)} className="absolute top-6 right-6 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20} /></button>
              <div className="flex items-center gap-4 mb-2"><div className="bg-white/20 p-3 rounded-2xl"><Ship size={24} /></div><h3 className="text-2xl font-bold uppercase tracking-tighter">{selectedEvent.servicio}</h3></div>
            </div>
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-4"><div className="bg-slate-100 p-3 rounded-2xl text-slate-500"><User size={20} /></div><div><p className="text-[10px] font-bold text-slate-400 uppercase">Cliente</p><p className="font-bold text-slate-800 text-lg leading-tight">{selectedEvent.cliente}</p></div></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border">
                  <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Fingerprint size={10} /> Cédula</p>
                  <p className="text-sm font-bold text-slate-700">{selectedEvent.cedula}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border">
                  <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><Phone size={10} /> Teléfono</p>
                  <p className="text-sm font-bold text-slate-700">{selectedEvent.celular}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border">
                  <p className="text-[9px] font-bold text-blue-400 uppercase flex items-center gap-1"><Users size={10} /> Pasajeros</p>
                  <p className="text-lg font-black text-blue-600">{selectedEvent.pasajeros} PAX</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-inner shadow-emerald-50">
                  <p className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1"><DollarSign size={10} /> Valor Total</p>
                  <p className="text-lg font-black text-emerald-600">${selectedEvent.valorTotal?.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] border flex items-center gap-4"><Clock size={20} className="text-blue-600" /><div><p className="text-[10px] font-bold text-slate-400 uppercase">Horario</p><p className="text-xl font-black text-blue-600">{formatearHora(selectedEvent.inicio)} - {formatearHora(selectedEvent.fin)}</p></div></div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => handleEliminar(selectedEvent.id)} className="bg-red-50 text-red-600 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"><Trash2 size={18} /> Cancelar</button>
                <button onClick={() => { setIsDetailsOpen(false); prepararEdicion(selectedEvent); }} className="bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"><Edit3 size={18} /> Reprogramar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center"><h3 className="text-2xl font-bold uppercase tracking-widest">{editingId ? 'Editar' : 'Nueva'} Reserva</h3><button onClick={() => { setIsModalOpen(false); setEditingId(null); }}><X size={24} /></button></div>
            <form className="p-10 space-y-5" onSubmit={handleSubmit}>
              <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl text-sm outline-none ring-1 ring-slate-200 focus:ring-blue-500 transition-all" placeholder="Nombre completo" />
              <div className="grid grid-cols-2 gap-4">
                <input required value={formData.cedula} onChange={e => setFormData({ ...formData, cedula: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl text-sm outline-none ring-1 ring-slate-200 focus:ring-blue-500 transition-all" placeholder="Cédula" />
                <input required value={formData.celular} onChange={e => setFormData({ ...formData, celular: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl text-sm outline-none ring-1 ring-slate-200 focus:ring-blue-500 transition-all" placeholder="Teléfono" />
              </div>
              <select required value={formData.servicioId} className="w-full px-5 py-4 bg-slate-50 border-0 rounded-2xl text-sm outline-none ring-1 ring-slate-200 focus:ring-blue-500 transition-all" onChange={e => setFormData({ ...formData, servicioId: e.target.value })}>
                <option value="">Selecciona el servicio...</option>{servicios.map(s => <option key={s.id} value={s.id}>{s.fields["Servicios"]}</option>)}
              </select>

              <div className="grid grid-cols-4 gap-3">
                <input type="date" required value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} className="px-3 py-4 bg-slate-50 rounded-2xl text-xs outline-none ring-1 ring-slate-200" title="Fecha" />
                <input type="time" required value={formData.horaInicio} onChange={e => setFormData({ ...formData, horaInicio: e.target.value })} className="px-3 py-4 bg-slate-50 rounded-2xl text-xs outline-none ring-1 ring-slate-200" title="Hora Inicio" />
                <input type="time" required value={formData.horaFin} onChange={e => setFormData({ ...formData, horaFin: e.target.value })} className="px-3 py-4 bg-slate-50 rounded-2xl text-xs outline-none ring-1 ring-slate-200" title="Hora Fin" />
                <input type="number" min="1" required value={formData.pasajeros} onChange={e => setFormData({ ...formData, pasajeros: e.target.value })} className="px-3 py-4 bg-slate-50 rounded-2xl text-xs outline-none ring-1 ring-blue-400 font-black text-center text-blue-600 bg-blue-50" title="Número de Pasajeros" placeholder="Pax" />
              </div>

              {formData.servicioId && (
                <div className="bg-emerald-50 p-4 rounded-2xl flex justify-between items-center border border-emerald-100 shadow-inner mt-2">
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Tarifa Base Aplicada</p>
                    <p className="text-sm font-bold text-emerald-800">${preview.tarifa.toLocaleString()} / hr</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valor Estimado</p>
                    <p className="text-2xl font-black text-emerald-600">${preview.total.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl uppercase tracking-widest text-xs shadow-blue-200 shadow-xl transition-transform active:scale-95 mt-4">
                {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editingId ? "Actualizar Reserva" : "Confirmar Programación")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}